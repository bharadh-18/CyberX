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

# 3. Explicit Security Bridge: CORS & Zero-Trust Middleware
from starlette.middleware.cors import CORSMiddleware

# Outermost: CORS must handle pre-flights before any other logic
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cyberx-b72d0.web.app",
        "https://cyberx-b72d0.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:5176",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https?://localhost:\d+|https://cyberx-.*\.web\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Critical: Security Audit & Validation Layers
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(InputValidationMiddleware)

# Include router AFTER all middleware to ensure they apply correctly
app.include_router(api_router, prefix="/api/v1")

# Serve static frontend files
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
    
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
async def serve_frontend():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "CyberX API is running. Static frontend not detected."}

from app.database import init_db

import asyncio

@app.on_event("startup")
async def startup_event():
    generate_keys()
    # Non-blocking DB init: prevents startup hang if Neon is slow
    asyncio.create_task(init_db())
    logger.info("CyberX Backend started. Database initialization running in background.")

