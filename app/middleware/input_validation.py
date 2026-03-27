import re
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import json
from datetime import datetime

logger = logging.getLogger("security_logger")

PATTERNS = {
    "sql_injection": re.compile(r"(\%27)|(\')|(\-\-)|(\%23)|(#)", re.IGNORECASE),
    "xss": re.compile(r"((%3C)|<)((%2F)|/)*[a-z0-9%]+((%3E)|>)", re.IGNORECASE),
    "path_traversal": re.compile(r"(\.\./)|(\.\.\\\\)|(%2e%2e)", re.IGNORECASE),
    "command_injection": re.compile(r"(;.*)|(\|.*)|(`.*`)", re.IGNORECASE)
}

class InputValidationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_url = str(request.url)
        
        for attack_type, pattern in PATTERNS.items():
            if pattern.search(raw_url):
                log_data = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "event": "MALICIOUS_INPUT_BLOCKED",
                    "severity": "HIGH",
                    "ip": request.client.host if request.client else "unknown",
                    "attack_type": attack_type,
                    "url": raw_url
                }
                logger.warning(json.dumps(log_data))
                return JSONResponse(status_code=400, content={"detail": "Invalid input detected."})
                
        return await call_next(request)
