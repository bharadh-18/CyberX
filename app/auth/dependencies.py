from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.auth.jwt_handler import verify_token
from app.config import settings
from app.services.cache import redis_client
from app.firebase_config import db as firestore_db

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
        
    user_doc = firestore_db.collection("users").document(user_id).get()
    
    if not user_doc.exists:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    user_data = user_doc.to_dict()
    user_data["id"] = user_id
    return user_data

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("account_status") not in ("active", "pending_verification"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user
