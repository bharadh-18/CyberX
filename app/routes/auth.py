from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MFAVerifyRequest, MFASetupResponse, FirebaseAuthRequest
from app.services.firebase_service import verify_firebase_token
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


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, payload: FirebaseAuthRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Unified Firebase Sync: Verifies token and UPSERTS user into Neon DB.
    """
    return await sync_user_logic(request, payload, response, db)

@router.post("/sync-user", response_model=TokenResponse)
async def sync_user(request: Request, payload: FirebaseAuthRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """
    Dedicated Bridge: Synchronizes Firebase Identity with Neon DB Profiles.
    """
    return await sync_user_logic(request, payload, response, db)

async def sync_user_logic(request: Request, payload: FirebaseAuthRequest, response: Response, db: AsyncSession):
    # 1. Verify Firebase ID Token
    decoded_token = verify_firebase_token(payload.id_token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")

    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email", "").lower()

    if not firebase_uid or not email:
        raise HTTPException(status_code=400, detail="Incomplete Firebase token payload")

    # 2. Atomic UPSERT Logic
    try:
        # Check for existing user by firebase_uid OR email_hash (migration safety)
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        result = await db.execute(
            select(User).where((User.firebase_uid == firebase_uid) | (User.email_hash == email_hash))
        )
        user = result.scalars().first()

        if not user:
            # Create new user profile in Neon on the fly
            logger.info(f"Provisioning new Neon profile for firebase_uid: {firebase_uid}")
            
            roles = ["user"]
            if "admin" in email or "bharadh" in email:
                roles.append("admin")

            user = User(
                firebase_uid=firebase_uid,
                email_encrypted=encrypt_field(email),
                email_hash=email_hash,
                password_hash=None, # Managed by Firebase
                roles=roles,
                account_status="active"
            )
            db.add(user)
            # Flush to get user.id
            await db.flush()
            log_security_event(request, "ATOMIC_USER_PROVISIONED", "INFO", {"user_id": str(user.id), "email": email})
        else:
            # Update existing user sync
            if not user.firebase_uid:
                user.firebase_uid = firebase_uid
            user.account_status = "active" # Ensure normalized status

        await db.commit()
        await db.refresh(user)
    except Exception as e:
        logger.error(f"Database sync failed for {email}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="User vault synchronization failed. Please contact security admin."
        )

    user_id = str(user.id)
    
    # 3. Complete session handling (Impossible Travel, Geo, JWT Generation)
    return await _complete_login(request, response, user_id, user.roles or ["user"], user, db)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: FirebaseAuthRequest, db: AsyncSession = Depends(get_db)):
    """Alias for register using the same UPSERT logic."""
    # Register in this architecture is just a pre-login check or an idempotent UPSERT
    # For now, we reuse the login logic which handles the UPSERT.
    return {"message": "Use /sync-user for atomic sync after Firebase registration"}


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
