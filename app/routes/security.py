from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime, timedelta
import random

from app.database import get_db
from app.models.user import User
from app.models.session import Session as DBSession
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/security", tags=["security"])

@router.get("/metrics")
async def get_security_metrics(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """Mocked metrics for the security dashboard MVP"""
    
    # In a real system, these would aggregate from Redis/TimescaleDB
    return {
        "active_sessions": random.randint(120, 300),
        "failed_logins_24h": random.randint(45, 80),
        "ips_blocked": random.randint(5, 12),
        "phishing_payloads_blocked": random.randint(150, 400),
        "threat_level": "Low",
        "system_load": f"{random.uniform(0.1, 0.8):.2f}"
    }

@router.get("/events")
async def get_security_events(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """Returns a list of recent security events. Mocks out real logs for the MVP."""
    
    now = datetime.utcnow()
    events = []
    
    # Generate some mock recent events
    event_types = [
        ("BRUTE_FORCE_DETECTED", "HIGH", "192.168.1.104"),
        ("SUCCESSFUL_LOGIN", "INFO", "10.0.0.5"),
        ("MFA_FAILED", "WARNING", "172.16.0.4"),
        ("PHISHING_BLOCKED", "HIGH", "10.0.0.12"),
        ("NEW_DEVICE_LOGIN", "WARNING", "192.168.1.200")
    ]
    
    for i in range(15):
        evt, sev, ip = random.choice(event_types)
        events.append({
            "id": f"evt_{random.randint(1000,9999)}",
            "timestamp": (now - timedelta(minutes=random.randint(1, 1440))).isoformat() + "Z",
            "event": evt,
            "severity": sev,
            "ip": ip,
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events
