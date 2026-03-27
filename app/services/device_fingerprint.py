import hashlib
from fastapi import Request

def get_device_fingerprint(request: Request) -> str:
    user_agent = request.headers.get("User-Agent", "")
    accept_language = request.headers.get("Accept-Language", "")
    accept_encoding = request.headers.get("Accept-Encoding", "")
    
    raw = f"{user_agent}|{accept_language}|{accept_encoding}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()
