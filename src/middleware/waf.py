import re
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from src.logging_config import logger

class WAFMiddleware:
    def __init__(self):
        # Compiled regexes for common attack patterns
        self.sql_injection = re.compile(
            r"(?i)(UNION.*SELECT|SELECT.*FROM|INSERT.*INTO|UPDATE.*SET|DELETE.*FROM|DROP.*TABLE|EXEC(\s|\())", 
            re.IGNORECASE
        )
        self.xss = re.compile(
            r"(?i)(<script>|javascript:|onerror=|onload=|eval\()", 
            re.IGNORECASE
        )
        self.path_traversal = re.compile(
            r"(?i)(\.\./|\.\.\\|%2e%2e%2f|%2e%2e\\)", 
            re.IGNORECASE
        )
        self.command_injection = re.compile(
            r"(?i)(;|\||&&|\$\(|\`.*\`)", 
            re.IGNORECASE
        )

        self.allowed_paths = ["/docs", "/openapi.json", "/auth/google", "/auth/google/callback"]

    def _check_string(self, text: str) -> str:
        if not text:
            return None
        if self.sql_injection.search(text):
            return "SQL Injection"
        if self.xss.search(text):
            return "Cross-Site Scripting (XSS)"
        if self.path_traversal.search(text):
            return "Path Traversal"
        if self.command_injection.search(text):
            return "Command Injection"
        return None

    async def __call__(self, request: Request, call_next):
        # Skip WAF for certain allowed paths (e.g. swagger)
        if request.url.path in self.allowed_paths:
            return await call_next(request)

        # 1. Check Query Params
        for key, value in request.query_params.items():
            violation = self._check_string(value)
            if violation:
                return self._block_request(request, violation, "query")

        # 2. Check Headers (User-Agent, Referer, etc.)
        for key, value in request.headers.items():
            if key.lower() not in ["authorization", "cookie"]: # Don't scan secrets here
                violation = self._check_string(value)
                if violation:
                    return self._block_request(request, violation, "header")

        # 3. Check Body (for JSON requests)
        # Note: reading body in middleware can be tricky, we'll do a simple check
        # and rely more on Pydantic schemas for deep body validation.
        # If Content-Type is application/json, we can peek at the raw bytes safely if we use a workaround
        # For a true production WAF, body parsing is complex and often done by reverse proxies (ModSecurity).

        return await call_next(request)

    def _block_request(self, request: Request, violation: str, source: str) -> JSONResponse:
        logger.warning(
            f"WAF Blocked Request: {violation} detected in {source}",
            extra={
                "category": "INTRUSION_DETECTION",
                "severity": "WARNING",
                "source_ip": request.client.host if request.client else None,
                "path": request.url.path,
                "method": request.method,
                "threat_indicators": {"waf_rule": violation}
            }
        )
        return JSONResponse(status_code=403, content={"detail": "Request blocked by Web Application Firewall."})

waf_middleware = WAFMiddleware()
