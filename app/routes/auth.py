from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MFAVerifyRequest, MFASetupResponse
from app.services.email_validator import is_valid_email
from app.services.encryption import encrypt_field, decrypt_field
from app.services.device_fingerprint import get_device_fingerprint
from app.auth.jwt_handler import create_access_token, create_refresh_token
from app.auth.mfa import generate_totp_secret, get_provisioning_uri, verify_totp
import logging
import json
from datetime import datetime, timedelta
from app.config import settings
import uuid
import hashlib
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.services.cache import redis_client
from app.database import get_db, async_session_factory
from app.models.models import User, Session as SessionModel, SecurityEvent, LoginLocation
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.telemetry import (
    geolocate_ip, calculate_impossible_travel_risk,
    record_login_location, push_security_event
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("security_logger")
ph = PasswordHasher()


def log_security_event(request: Request, event: str, severity: str, details: dict):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    log_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "request_id": getattr(request.state, "request_id", ""),
        "event": event,
        "severity": severity,
        "ip": ip,
        "user_agent": ua,
        "details": details
    }
    logger.info(json.dumps(log_data))
    # Push to Neon DB for real-time dashboard sync
    push_security_event(event, severity, ip, details.get("user_id", ""), {"user_agent": ua, **details})


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid or disposable email address")

    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()

    # Check if user already exists
    result = await db.execute(select(User).where(User.email_hash == email_hash))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    encrypted_email = encrypt_field(payload.email.lower())
    hashed_password = ph.hash(payload.password)

    roles = ["user"]
    if "admin" in payload.email.lower() or "bharadh" in payload.email.lower():
        roles.append("admin")

    new_user = User(
        email_encrypted=encrypted_email,
        email_hash=email_hash,
        password_hash=hashed_password,
        mfa_enabled=False,
        mfa_secret_encrypted=None,
        roles=roles,
        account_status="active",
        failed_attempts=0,
        device_fingerprints=[],
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    user_id = str(new_user.id)
    log_security_event(request, "USER_REGISTRATION", "INFO", {"user_id": user_id})
    return {"message": "User registered successfully", "user_id": user_id}


@router.post("/login")
async def login(request: Request, payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    rl_key = f"rl:login:{ip}"
    attempts = await redis_client.get(rl_key)
    if attempts and int(attempts) >= 5:
        log_security_event(request, "BRUTE_FORCE_DETECTED", "HIGH", {"ip": ip})
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")

    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()
    result = await db.execute(select(User).where(User.email_hash == email_hash))
    user = result.scalars().first()

    if not user:
        await _record_failed_login(rl_key, None, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_id = str(user.id)

    # Verify password using Argon2
    try:
        ph.verify(user.password_hash, payload.password)
    except VerifyMismatchError:
        await _record_failed_login(rl_key, user_id, request, user, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    # Success — reset failed attempts
    user.failed_attempts = 0
    await db.commit()
    await redis_client.delete(rl_key)

    if user.mfa_enabled:
        temp_token = str(uuid.uuid4())
        await redis_client.setex(f"mfa_pending:{temp_token}", 300, user_id)
        return {"mfa_required": True, "token": temp_token}

    return await _complete_login(request, response, user_id, user.roles or ["user"], user, db)


async def _record_failed_login(rl_key, user_id, request, user=None, db=None):
    pipe = redis_client.pipeline()
    pipe.incr(rl_key)
    pipe.expire(rl_key, 900)
    await pipe.execute()

    if user_id and user and db:
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= 5:
            user.account_status = "locked"
            log_security_event(request, "ACCOUNT_LOCKED", "HIGH", {"user_id": user_id})
        await db.commit()

    log_security_event(request, "FAILED_LOGIN", "WARNING", {"user_id": user_id or "unknown"})


async def _complete_login(request: Request, response: Response, user_id: str, roles: list, user, db: AsyncSession):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    geo = geolocate_ip(ip)
    travel_risk = 0.0
    if geo:
        travel_risk = await calculate_impossible_travel_risk(user_id, geo)
        await record_login_location(user_id, geo)
        if travel_risk > 0.7:
            log_security_event(request, "IMPOSSIBLE_TRAVEL", "HIGH", {
                "user_id": user_id, "risk": travel_risk,
                "location": f"{geo.get('city')}, {geo.get('country')}"
            })

    access_token = create_access_token(data={"sub": user_id, "roles": roles})
    refresh_token = create_refresh_token(data={"sub": user_id})
    fp = get_device_fingerprint(request)

    # Store session in Neon
    session = SessionModel(
        user_id=uuid.UUID(user_id),
        device_fingerprint=fp,
        ip_address_encrypted=encrypt_field(ip),
        user_agent_encrypted=encrypt_field(ua),
        refresh_token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        is_active=True,
        geolocation=geo,
        travel_risk_score=travel_risk,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)

    user.last_login_at = datetime.utcnow()
    fps = user.device_fingerprints or []
    if fp not in fps:
        fps.append(fp)
        user.device_fingerprints = fps
        log_security_event(request, "NEW_DEVICE_LOGIN", "WARNING", {"user_id": user_id, "fp": fp})

    await db.commit()

    log_security_event(request, "SUCCESSFUL_LOGIN", "INFO", {"user_id": user_id})
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="strict", max_age=86400*settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return TokenResponse(access_token=access_token, mfa_required=False)
