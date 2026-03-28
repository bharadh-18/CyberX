from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.auth.jwt_handler import generate_keys
from app.services.security_logger import setup_logger
import os

setup_logger()

from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.input_validation import InputValidationMiddleware
from app.routes import api_router

app = FastAPI(
    title="Zero-Trust Backend API",
    description="Backend API with AI Phishing Detection and MFA",
    version="1.0.0"
)

app.add_middleware(InputValidationMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cyberx-b72d0.web.app", 
        "http://localhost:5173",
        "http://localhost:5176" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Serve static frontend files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

from app.database import init_db

@app.on_event("startup")
async def startup_event():
    generate_keys()
    await init_db()

