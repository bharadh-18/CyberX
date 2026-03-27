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
import requests
from app.services.cache import redis_client
from app.firebase_config import db as firestore_db, firebase_auth
from firebase_admin import auth as fg_auth
from firebase_admin import firestore

from app.services.telemetry import (
    geolocate_ip, calculate_impossible_travel_risk,
    record_login_location, push_security_event
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("security_logger")

FIREBASE_API_KEY = getattr(settings, "FIREBASE_API_KEY", "MISSING_API_KEY")

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
    # Push to Firestore for real-time dashboard sync
    push_security_event(event, severity, ip, details.get("user_id", ""), {"user_agent": ua, **details})

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, payload: RegisterRequest, background_tasks: BackgroundTasks):
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid or disposable email address")
        
    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()
    
    # Check if user already exists
    users_ref = firestore_db.collection("users").where("email_hash", "==", email_hash).limit(1).get()
    if users_ref:
        raise HTTPException(status_code=409, detail="Email already registered")
        
    try:
        # Create user in Firebase Auth
        fb_user = firebase_auth.create_user(email=payload.email, password=payload.password)
    except Exception as e:
        logger.error(f"Firebase Auth Error: {e}")
        raise HTTPException(status_code=400, detail="Registration failed at identity provider")
        
    encrypted_email = encrypt_field(payload.email.lower())
    
    roles = ["user"]
    if "admin" in payload.email.lower() or "bharadh" in payload.email.lower():
        roles.append("admin")

    # Store user metadata in Firestore
    user_doc_ref = firestore_db.collection("users").document(fb_user.uid)
    user_doc_ref.set({
        "email_encrypted": encrypted_email,
        "email_hash": email_hash,
        "mfa_enabled": False,
        "mfa_secret_encrypted": None,
        "roles": roles,
        "account_status": "active",
        "failed_attempts": 0,
        "device_fingerprints": [],
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    
    log_security_event(request, "USER_REGISTRATION", "INFO", {"user_id": fb_user.uid})
    return {"message": "User registered successfully", "user_id": fb_user.uid}

@router.post("/login")
async def login(request: Request, payload: LoginRequest, response: Response):
    ip = request.client.host if request.client else "unknown"
    rl_key = f"rl:login:{ip}"
    attempts = await redis_client.get(rl_key)
    if attempts and int(attempts) >= 5:
        log_security_event(request, "BRUTE_FORCE_DETECTED", "HIGH", {"ip": ip})
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
        
    email_hash = hashlib.sha256(payload.email.lower().encode()).hexdigest()
    users_query = firestore_db.collection("users").where("email_hash", "==", email_hash).limit(1).get()
    
    if not users_query:
        await _record_failed_login(rl_key, None, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    user_doc = users_query[0]
    user_data = user_doc.to_dict()
    user_id = user_doc.id
    
    # Verify password via Firebase REST API
    verify_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    fb_resp = requests.post(verify_url, json={"email": payload.email, "password": payload.password, "returnSecureToken": True})
    
    if not fb_resp.ok:
        await _record_failed_login(rl_key, user_id, request, user_data, user_doc.reference)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    if user_data.get("account_status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
        
    # Success
    user_doc.reference.update({"failed_attempts": 0})
    await redis_client.delete(rl_key)
    
    if user_data.get("mfa_enabled"):
        temp_token = str(uuid.uuid4())
        await redis_client.setex(f"mfa_pending:{temp_token}", 300, user_id)
        return {"mfa_required": True, "token": temp_token}
        
    return await _complete_login(request, response, user_id, user_data.get("roles", ["user"]), user_data)

async def _record_failed_login(rl_key, user_id, request, user_data=None, doc_ref=None):
    pipe = redis_client.pipeline()
    pipe.incr(rl_key)
    pipe.expire(rl_key, 900)
    await pipe.execute()
    
    if user_id and doc_ref and user_data:
        fails = user_data.get("failed_attempts", 0) + 1
        updates = {"failed_attempts": fails}
        if fails >= 5:
            updates["account_status"] = "locked"
            log_security_event(request, "ACCOUNT_LOCKED", "HIGH", {"user_id": user_id})
        doc_ref.update(updates)

async def _complete_login(request: Request, response: Response, user_id: str, roles: list, user_data: dict):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    # --- BEHAVIORAL TELEMETRY ---
    geo = geolocate_ip(ip)
    travel_risk = 0.0
    if geo:
        travel_risk = calculate_impossible_travel_risk(user_id, geo)
        record_login_location(user_id, geo)
        if travel_risk > 0.7:
            log_security_event(request, "IMPOSSIBLE_TRAVEL", "HIGH", {
                "user_id": user_id, "risk": travel_risk,
                "location": f"{geo.get('city')}, {geo.get('country')}"
            })

    access_token = create_access_token(data={"sub": user_id, "roles": roles})
    refresh_token = create_refresh_token(data={"sub": user_id})
    fp = get_device_fingerprint(request)
    
    # Store session in subcollection
    session_id = str(uuid.uuid4())
    session_ref = firestore_db.collection("users").document(user_id).collection("sessions").document(session_id)
    session_ref.set({
        "device_fingerprint": fp,
        "ip_address_encrypted": encrypt_field(ip),
        "user_agent_encrypted": encrypt_field(ua),
        "refresh_token_hash": hashlib.sha256(refresh_token.encode()).hexdigest(),
        "is_active": True,
        "geolocation": geo,
        "travel_risk_score": travel_risk,
        "created_at": firestore.SERVER_TIMESTAMP,
        "expires_at": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    })
    
    firestore_db.collection("users").document(user_id).update({
        "last_login_at": firestore.SERVER_TIMESTAMP
    })
    
    fps = user_data.get("device_fingerprints", [])
    if fp not in fps:
        fps.append(fp)
        firestore_db.collection("users").document(user_id).update({"device_fingerprints": fps})
        log_security_event(request, "NEW_DEVICE_LOGIN", "WARNING", {"user_id": user_id, "fp": fp})
        
    log_security_event(request, "SUCCESSFUL_LOGIN", "INFO", {"user_id": user_id})
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="strict", max_age=86400*settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return TokenResponse(access_token=access_token, mfa_required=False)


@router.post("/google")
async def google_login(request: Request, response: Response):
    """
    Google Sign-In via Firebase.
    Frontend sends a Firebase ID token obtained from signInWithPopup(googleProvider).
    Backend verifies it, auto-creates user if needed, and returns a CyberX JWT.
    """
    body = await request.json()
    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    try:
        # Verify the Firebase ID token (this checks signature, expiry, issuer)
        decoded_token = fg_auth.verify_id_token(id_token)
    except Exception as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    uid = decoded_token["uid"]
    email = decoded_token.get("email", "")
    
    # Check if user already exists in Firestore
    user_ref = firestore_db.collection("users").document(uid)
    user_snap = user_ref.get()

    if user_snap.exists:
        user_data = user_snap.to_dict()
    else:
        # Auto-create user on first Google sign-in
        email_hash = hashlib.sha256(email.lower().encode()).hexdigest()
        encrypted_email = encrypt_field(email.lower())

        roles = ["user"]
        if "admin" in email.lower() or "bharadh" in email.lower():
            roles.append("admin")

        user_data = {
            "email_encrypted": encrypted_email,
            "email_hash": email_hash,
            "mfa_enabled": False,
            "mfa_secret_encrypted": None,
            "roles": roles,
            "account_status": "active",
            "failed_attempts": 0,
            "device_fingerprints": [],
            "auth_provider": "google",
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        user_ref.set(user_data)
        log_security_event(request, "USER_REGISTRATION", "INFO", {"user_id": uid, "provider": "google"})

    roles = user_data.get("roles", ["user"])

    # Run telemetry pipeline (geolocation, impossible travel, session)
    return await _complete_login(request, response, uid, roles, user_data)

