from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_active_user

ROLE_PERMISSIONS = {
    "user": {"profile:read", "comment:create", "comment:read"},
    "moderator": {"profile:read", "comment:create", "comment:read", "comment:moderate", "analysis:read"},
    "admin": {"profile:read", "comment:create", "comment:read", "comment:moderate", "analysis:read", "admin:all"}
}

class RequirePermission:
    def __init__(self, permission: str):
        self.permission = permission

    async def __call__(self, current_user: dict = Depends(get_current_active_user)):
        user_permissions = set()
        for role in current_user.get("roles", []):
            user_permissions.update(ROLE_PERMISSIONS.get(role, set()))
            if role == "admin":
                return True
                
        if self.permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return True
