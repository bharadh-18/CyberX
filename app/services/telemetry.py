"""
Behavioral Telemetry Service
Implements IP Geolocation and "Impossible Travel" detection using the Haversine formula.
"""
import math
import logging
import requests as http_requests
from datetime import datetime
from typing import Optional, Dict, Any
from app.firebase_config import db as firestore_db
from firebase_admin import firestore

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
    # HACKATHON DEMO OVERRIDE: 
    # If testing locally, force the location to Chennai, India instead of resolving 
    # the cloud VM's external IP (which is usually in America/Europe).
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


def calculate_impossible_travel_risk(user_id: str, current_geo: Dict[str, Any]) -> float:
    """
    Compare the user's current login location against their last 5 login locations.
    Returns a risk score from 0.0 (safe) to 1.0 (impossible travel detected).
    """
    try:
        login_history = (
            firestore_db.collection("users")
            .document(user_id)
            .collection("login_locations")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(5)
            .get()
        )
    except Exception:
        return 0.0

    if not login_history:
        return 0.0

    max_risk = 0.0
    now = datetime.utcnow()

    for doc in login_history:
        prev = doc.to_dict()
        prev_lat = prev.get("lat", 0)
        prev_lon = prev.get("lon", 0)
        prev_time = prev.get("timestamp")

        if not prev_time:
            continue

        # Handle Firestore Timestamp objects
        if hasattr(prev_time, 'timestamp'):
            prev_dt = datetime.utcfromtimestamp(prev_time.timestamp())
        else:
            prev_dt = prev_time

        distance_km = haversine_distance(current_geo["lat"], current_geo["lon"], prev_lat, prev_lon)
        time_diff_hours = max((now - prev_dt).total_seconds() / 3600, 0.01)

        required_speed = distance_km / time_diff_hours

        if required_speed > MAX_TRAVEL_SPEED_KMH:
            risk = min(required_speed / (MAX_TRAVEL_SPEED_KMH * 3), 1.0)
            max_risk = max(max_risk, risk)
            logger.warning(
                f"IMPOSSIBLE_TRAVEL: user={user_id}, distance={distance_km:.0f}km, "
                f"time={time_diff_hours:.1f}h, speed={required_speed:.0f}km/h, risk={risk:.2f}"
            )

    return round(max_risk, 4)


def record_login_location(user_id: str, geo: Dict[str, Any]):
    """Store the current login geolocation in Firestore for future comparisons."""
    firestore_db.collection("users").document(user_id).collection("login_locations").add({
        "lat": geo["lat"],
        "lon": geo["lon"],
        "city": geo.get("city", "Unknown"),
        "country": geo.get("country", "Unknown"),
        "ip": geo.get("query", "unknown"),
        "timestamp": firestore.SERVER_TIMESTAMP
    })


def push_security_event(event_type: str, severity: str, ip: str, user_id: str, details: dict):
    """Write a security event to the global Firestore collection for real-time dashboard sync."""
    firestore_db.collection("security_events").add({
        "event": event_type,
        "severity": severity,
        "ip": ip,
        "user_id": user_id,
        "user_agent": details.get("user_agent", ""),
        "details": details,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
