from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.auth.jwt_handler import verify_token
from app.config import settings
from app.services.cache import redis_client
from app.database import async_session_factory
from app.models.models import User
from sqlalchemy import select
import uuid as uuid_mod

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    is_blacklisted = await redis_client.get(f"bl:{token}")
    if is_blacklisted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.id == uuid_mod.UUID(user_id)))
        user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user_data = {
        "id": str(user.id),
        "email_hash": user.email_hash,
        "roles": user.roles or ["user"],
        "account_status": user.account_status,
        "mfa_enabled": user.mfa_enabled,
        "failed_attempts": user.failed_attempts,
        "device_fingerprints": user.device_fingerprints or [],
    }
    return user_data

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("account_status") not in ("active", "pending_verification"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user
