from fastapi import APIRouter
from src.config import settings

router = APIRouter(tags=["System"])

@router.get("/health")
async def health_check():
    """Application readiness/liveness check."""
    return {"status": "healthy", "project": settings.PROJECT_NAME}

@router.get("/version")
async def get_version():
    """Return API version."""
    return {"version": settings.VERSION}
