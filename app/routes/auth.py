from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.models.session import Session as DBSession
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MFAVerifyRequest, MFASetupResponse
from app.services.email_validator import is_valid_email
from app.services.password import hash_password, verify_password
from app.services.encryption import encrypt_field, decrypt_field
from app.services.device_fingerprint import get_device_fingerprint
from app.auth.jwt_handler import create_access_token, create_refresh_token
from app.auth.mfa import generate_totp_secret, get_provisioning_uri, verify_totp
from app.auth.dependencies import get_current_user, get_current_active_user
import logging
import json
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.config import settings
import uuid
import hashlib

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("security_logger")
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

def log_security_event(request: Request, event: str, severity: str, details: dict):
    log_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "request_id": getattr(request.state, "request_id", ""),
        "event": event,
        "severity": severity,
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", ""),
        "details": details
    }
    logger.info(json.dumps(log_data))

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid or disposable email address")
        
    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()
    
    result = await db.execute(select(User).filter(User.email_hash == email_hash))
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Email already registered")
        
    pwd_hash = hash_password(payload.password)
    encrypted_email = encrypt_field(payload.email.lower())
    
    new_user = User(
        email_encrypted=encrypted_email,
        email_hash=email_hash,
        password_hash=pwd_hash,
        account_status="active" # Auto-active for hackathon simplicity
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    log_security_event(request, "USER_REGISTRATION", "INFO", {"user_id": new_user.id})
    return {"message": "User registered successfully", "user_id": new_user.id}

@router.post("/login")
async def login(request: Request, payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    rl_key = f"rl:login:{ip}"
    attempts = await redis_client.get(rl_key)
    if attempts and int(attempts) >= 5:
        log_security_event(request, "BRUTE_FORCE_DETECTED", "HIGH", {"ip": ip})
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
        
    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()
    result = await db.execute(select(User).filter(User.email_hash == email_hash))
    user = result.scalars().first()
    
    if not user or not verify_password(user.password_hash, payload.password):
        pipe = redis_client.pipeline()
        pipe.incr(rl_key)
        pipe.expire(rl_key, 900) # 15 min penalty
        await pipe.execute()
        
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.account_status = "locked"
                log_security_event(request, "ACCOUNT_LOCKED", "HIGH", {"user_id": user.id})
            await db.commit()
            
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
        
    user.failed_attempts = 0
    await redis_client.delete(rl_key)
    
    if user.mfa_enabled:
        temp_token = str(uuid.uuid4())
        await redis_client.setex(f"mfa_pending:{temp_token}", 300, user.id)
        return {"mfa_required": True, "token": temp_token}
        
    return await _complete_login(request, response, user, db)

async def _complete_login(request: Request, response: Response, user: User, db: AsyncSession):
    access_token = create_access_token(data={"sub": user.id, "roles": user.roles})
    refresh_token = create_refresh_token(data={"sub": user.id})
    fp = get_device_fingerprint(request)
    
    new_session = DBSession(
        user_id=user.id,
        device_fingerprint=fp,
        ip_address_encrypted=encrypt_field(request.client.host if request.client else "unknown"),
        user_agent_encrypted=encrypt_field(request.headers.get("user-agent", "")),
        refresh_token_hash=hashlib.sha256(refresh_token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_session)
    
    user.last_login_at = datetime.utcnow()
    # simple tracking
    if not user.device_fingerprints:
        user.device_fingerprints = []
    if fp not in user.device_fingerprints:
        fps = user.device_fingerprints.copy()
        fps.append(fp)
        user.device_fingerprints = fps
        log_security_event(request, "NEW_DEVICE_LOGIN", "WARNING", {"user_id": user.id, "fp": fp})
        
    await db.commit()
    log_security_event(request, "SUCCESSFUL_LOGIN", "INFO", {"user_id": user.id})
    
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="strict", max_age=86400*settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return TokenResponse(access_token=access_token)

@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA is already enabled")
        
    secret = generate_totp_secret()
    email = decrypt_field(current_user.email_encrypted)
    uri = get_provisioning_uri(secret, email)
    
    current_user.mfa_secret_encrypted = encrypt_field(secret)
    current_user.mfa_enabled = True
    await db.commit()
    
    return MFASetupResponse(secret=secret, qr_code_url=uri)

@router.post("/mfa/verify")
async def verify_mfa(request: Request, response: Response, payload: MFAVerifyRequest, db: AsyncSession = Depends(get_db)):
    user_id = await redis_client.get(f"mfa_pending:{payload.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired MFA token")
        
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user or not user.mfa_enabled or not user.mfa_secret_encrypted:
        raise HTTPException(status_code=400, detail="MFA not properly configured")
        
    secret = decrypt_field(user.mfa_secret_encrypted)
    if not verify_totp(secret, payload.code):
        log_security_event(request, "MFA_FAILED", "WARNING", {"user_id": user.id})
        raise HTTPException(status_code=401, detail="Invalid MFA code")
        
    await redis_client.delete(f"mfa_pending:{payload.token}")
    return await _complete_login(request, response, user, db)

@router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_active_user)):
    # Simple logout: blacklist current token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        await redis_client.setex(f"bl:{token}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "true")
        log_security_event(request, "USER_LOGOUT", "INFO", {"user_id": current_user.id})
    response = Response(content=json.dumps({"message": "Successfully logged out"}), media_type="application/json")
    response.delete_cookie("refresh_token")
    return response

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    # Extract refresh token from HttpOnly cookie
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    from app.auth.jwt_handler import verify_token
    payload = verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    # Verify token exists and is valid in DB
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    result = await db.execute(select(DBSession).filter(DBSession.refresh_token_hash == token_hash))
    db_session = result.scalars().first()
    
    if not db_session or db_session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid")

    # Fetch user
    user_result = await db.execute(select(User).filter(User.id == user_id))
    user = user_result.scalars().first()
    
    if not user or user.account_status != "active":
        raise HTTPException(status_code=403, detail="User account is inactive or deleted")

    # Generate new access token
    access_token = create_access_token(data={"sub": user.id, "roles": user.roles})
    
    # We could do rolling refresh tokens here, but for now we just issue a new access token
    return TokenResponse(access_token=access_token)
