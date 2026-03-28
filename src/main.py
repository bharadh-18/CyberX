from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import time

from src.config import settings
from src.database import engine, Base
from src.logging_config import logger, setup_logging
from src.routes import auth_router, health_router
from src.middleware import rate_limiter, waf_middleware, SecurityHeadersMiddleware

# Setup structured logging
setup_logging()

# Application startup and teardown events
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing API...", extra={"category": "CONFIGURATION_CHANGES"})
    
    # Initialize Rate Limiter Redis Connection
    await rate_limiter.connect()
    
    # In a real production app, use Alembic for migrations instead of create_all
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    yield
    # Shutdown
    logger.info("Shutting down API...", extra={"category": "CONFIGURATION_CHANGES"})
    await rate_limiter.close()
    await engine.dispose()

# Initialize API
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apply custom Security Middlewares
# Notes: Middleware is executed in reverse order of addition.
# 1. log_requests handles outermost request logging
# 2. rate_limiter handles limits
# 3. waf_middleware scans payload
# 4. SecurityHeadersMiddleware appends headers on response
app.add_middleware(SecurityHeadersMiddleware)

@app.middleware("http")
async def waf_layer(request: Request, call_next):
    return await waf_middleware(request, call_next)

@app.middleware("http")
async def rate_limit_layer(request: Request, call_next):
    return await rate_limiter(request, call_next)

# Very basic request logging middleware (will be expanded in phase 2)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Generate request id if not passsed
    import uuid
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    
    response = None
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        # Log successful completion
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "response_time_ms": round(process_time, 2),
                "request_id": request_id,
                "source_ip": request.client.host if request.client else None,
            }
        )
        # Add request id to response headers
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"Unhandled Exception: {str(e)}",
            exc_info=True,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "response_time_ms": round(process_time, 2),
                "request_id": request_id,
                "source_ip": request.client.host if request.client else None,
                "severity": "CRITICAL",
                "category": "INTRUSION_DETECTION", # Or just SYSTEM_ERROR
            }
        )
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)

if __name__ == "__main__":
    import uvicorn
    # Local dev runner
    uvicorn.run("src.main:app", host="0.0.0.0", port=8443, reload=True)
