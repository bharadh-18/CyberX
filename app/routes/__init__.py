from fastapi import APIRouter
from .auth import router as auth_router
from .comments import router as comments_router
from .users import router as users_router
from .health import router as health_router
from .security import router as security_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(comments_router)
api_router.include_router(users_router)
api_router.include_router(health_router)
api_router.include_router(security_router)
