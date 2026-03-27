import uuid
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import json
from datetime import datetime

logger = logging.getLogger("security_logger")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "request_id": request_id,
            "event": "API_REQUEST",
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2)
        }
        logger.info(json.dumps(log_data))
        
        response.headers["X-Request-ID"] = request_id
        return response
