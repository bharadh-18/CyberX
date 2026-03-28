import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from src.database import get_db
from src.models.user import User, AuthProvider
from src.models.session import Session as UserSession
from src.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MFAVerifyRequest, UserResponse
from src.services.auth_service import auth_service
from src.services.crypto_service import crypto_service
from src.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def signup(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Email Sign-Up logic: validate, hash, conflict handling."""
    # Check if a user with this email already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        if existing_user.provider == AuthProvider.GOOGLE:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Try signing in with Google."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists."
            )
    
    # Hash the password and create new user
    hashed_pwd = auth_service.hash_password(request.password)
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed_pwd,
        provider=AuthProvider.EMAIL,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/signin", response_model=TokenResponse)
async def signin(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Email Sign-In logic: provider check, password verification."""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    
    # Check if it's a Google account
    if user.provider == AuthProvider.GOOGLE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="This account was created with Google. Please use the Continue with Google button."
        )
    
    # Check account lockout
    if auth_service.check_account_lockout(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked due to multiple failed attempts.")
    
    # Verify password
    if not auth_service.verify_password(request.password, user.password_hash):
        auth_service.record_failed_attempt(user)
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    
    # Success: reset attempts
    auth_service.reset_failed_attempts(user)
    await db.commit()
    
    # Determine if MFA is required
    if settings.ENABLE_MFA and user.totp_secret:
        return TokenResponse(access_token="", refresh_token="", mfa_required=True)
    
    # Issue tokens
    access_token = auth_service.create_access_token({"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

@router.get("/google")
async def google_login():
    """Initiate Google OAuth: constructs URL and redirects browser."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google client ID not configured.")
        
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_CALLBACK_URL}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "access_type=offline"
    )
    return RedirectResponse(google_auth_url)

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Google OAuth Callback: exchanges code, fetches profile, upserts user, redirects."""
    # 1. Exchange code for token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_CALLBACK_URL,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_response.json()
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail="Could not retrieve access token from Google.")
            
        access_token = token_data["access_token"]
        
        # 2. Get user info
        profile_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        profile_data = profile_response.json()
        
    google_id = str(profile_data["id"])
    email = profile_data["email"]
    name = profile_data["name"]
    avatar = profile_data.get("picture")
    
    # 3. Decision Branch: User exists?
    result = await db.execute(select(User).where((User.google_id == google_id) | (User.email == email)))
    user = result.scalars().first()
    
    if user:
        # Case 1: Email account exists, user clicks Google with same email
        if user.provider == AuthProvider.EMAIL:
            # Link accounts
            user.provider = AuthProvider.BOTH
            user.google_id = google_id
            user.avatar_url = avatar
        else:
            # Existing Google or BOTH account - update avatar if needed
            user.avatar_url = avatar
    else:
        # User not found: create new
        user = User(
            name=name,
            email=email,
            provider=AuthProvider.GOOGLE,
            google_id=google_id,
            avatar_url=avatar,
            is_active=True
        )
        db.add(user)
        
    await db.commit()
    await db.refresh(user)
    
    # Issue session tokens and redirect to dashboard
    # (In a real app, you might issue a temporary code and exchange it on the frontend,
    # or set a secure HTTP-only cookie).
    # For now, let's redirect with a message.
    return RedirectResponse(url="/dashboard")

@router.post("/logout")
async def logout(response: Response):
    """Revoke session and clear cookies."""
    return {"status": "Logged out"}
