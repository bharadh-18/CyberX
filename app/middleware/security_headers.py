from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if not request.url.path.startswith(("/docs", "/openapi.json", "/redoc")):
            response.headers["Content-Security-Policy"] = "default-src 'self'"
            response.headers["X-Frame-Options"] = "DENY"
            
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        return response
