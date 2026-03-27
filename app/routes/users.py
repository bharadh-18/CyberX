from fastapi import APIRouter, Depends, Request
from app.models.user import User
from app.schemas.user import UserProfileResponse
from app.authorization.rbac import RequirePermission
from app.auth.dependencies import get_current_active_user
from app.services.encryption import decrypt_field
from app.routes.auth import log_security_event

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    _=Depends(RequirePermission("profile:read"))
):
    email = decrypt_field(current_user.email_encrypted)
    log_security_event(request, "DATA_ACCESS", "INFO", {"accessed": ["email", "profile"], "user_id": current_user.id})
    return UserProfileResponse(
        id=current_user.id,
        email=email,
        roles=current_user.roles,
        created_at=current_user.created_at
    )
