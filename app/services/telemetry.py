"""
Behavioral Telemetry Service — Neon Postgres Edition.
Implements IP Geolocation and "Impossible Travel" detection using the Haversine formula.
"""
import math
import logging
import requests as http_requests
from datetime import datetime
from typing import Optional, Dict, Any
from app.database import async_session_factory
from app.models.models import LoginLocation, SecurityEvent
from sqlalchemy import select, desc

logger = logging.getLogger("security_logger")

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0

# Maximum plausible travel speed (km/h) - commercial aircraft
MAX_TRAVEL_SPEED_KMH = 900.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth."""
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def geolocate_ip(ip: str) -> Optional[Dict[str, Any]]:
    """Get geolocation data for an IP address using free ip-api.com service."""
    if ip in ("127.0.0.1", "localhost", "::1", "testclient", "unknown", "0.0.0.0"):
        return {
            "lat": 13.0827,
            "lon": 80.2707,
            "city": "Chennai",
            "country": "India",
            "query": "127.0.0.1"
        }

    try:
        resp = http_requests.get(f"http://ip-api.com/json/{ip}", timeout=3)
        if resp.ok:
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "lat": data["lat"],
                    "lon": data["lon"],
                    "city": data.get("city", "Unknown"),
                    "country": data.get("country", "Unknown"),
                    "query": ip
                }
    except Exception as e:
        logger.warning(f"IP Geolocation failed for {ip}: {e}")

    return None


async def calculate_impossible_travel_risk(user_id: str, current_geo: Dict[str, Any]) -> float:
    """
    Compare the user's current login location against their last 5 login locations.
    Returns a risk score from 0.0 (safe) to 1.0 (impossible travel detected).
    """
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(LoginLocation)
                .where(LoginLocation.user_id == user_id)
                .order_by(desc(LoginLocation.timestamp))
                .limit(5)
            )
            login_history = result.scalars().all()
    except Exception:
        return 0.0

    if not login_history:
        return 0.0

    max_risk = 0.0
    now = datetime.utcnow()

    for prev in login_history:
        prev_lat = prev.lat or 0
        prev_lon = prev.lon or 0
        prev_time = prev.timestamp

        if not prev_time:
            continue

        # Handle timezone-aware datetimes
        if prev_time.tzinfo is not None:
            from datetime import timezone
            now_aware = datetime.now(timezone.utc)
            time_diff_hours = max((now_aware - prev_time).total_seconds() / 3600, 0.01)
        else:
            time_diff_hours = max((now - prev_time).total_seconds() / 3600, 0.01)

        distance_km = haversine_distance(current_geo["lat"], current_geo["lon"], prev_lat, prev_lon)
        required_speed = distance_km / time_diff_hours

        if required_speed > MAX_TRAVEL_SPEED_KMH:
            risk = min(required_speed / (MAX_TRAVEL_SPEED_KMH * 3), 1.0)
            max_risk = max(max_risk, risk)
            logger.warning(
                f"IMPOSSIBLE_TRAVEL: user={user_id}, distance={distance_km:.0f}km, "
                f"time={time_diff_hours:.1f}h, speed={required_speed:.0f}km/h, risk={risk:.2f}"
            )

    return round(max_risk, 4)


async def record_login_location(user_id: str, geo: Dict[str, Any]):
    """Store the current login geolocation in Neon for future comparisons."""
    async with async_session_factory() as session:
        loc = LoginLocation(
            user_id=user_id,
            lat=geo["lat"],
            lon=geo["lon"],
            city=geo.get("city", "Unknown"),
            country=geo.get("country", "Unknown"),
            ip=geo.get("query", "unknown"),
        )
        session.add(loc)
        await session.commit()


def push_security_event(event_type: str, severity: str, ip: str, user_id: str, details: dict):
    """Write a security event to the Neon security_events table for real-time dashboard sync.
    Uses a sync-compatible approach for use from non-async log_security_event."""
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_async_push_event(event_type, severity, ip, user_id, details))
    except RuntimeError:
        # No running event loop — skip (happens during tests or startup)
        pass


async def _async_push_event(event_type: str, severity: str, ip: str, user_id: str, details: dict):
    """Async helper to insert a security event into Neon."""
    try:
        async with async_session_factory() as session:
            evt = SecurityEvent(
                event=event_type,
                severity=severity,
                ip=ip,
                user_id=user_id,
                user_agent=details.get("user_agent", ""),
                details=details,
            )
            session.add(evt)
            await session.commit()
    except Exception as e:
        logger.warning(f"Failed to push security event to Neon: {e}")
