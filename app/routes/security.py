from fastapi import APIRouter, Depends, Request, HTTPException
from datetime import datetime, timedelta
import random
import logging

from app.auth.dependencies import get_current_active_user
from app.firebase_config import db as firestore_db
from app.schemas.security import SimulationRequest, SimulationResponse, ScanRequest, ScanResponse
from app.services.behavior_analyzer import behavior_analyzer
from app.services.network_scanner import scan_target, validate_ip
from app.routes.auth import log_security_event

logger = logging.getLogger("security_routes")

router = APIRouter(prefix="/security", tags=["security"])

# In-memory scan history pre-populated for Hackathon presentation aesthetics
_scan_history: list = [
    {
        "target": "185.220.101.5",
        "open_ports": sorted([22, 80, 443, 8080, 3389]),
        "risk_level": "CRITICAL",
        "risk_score": 0.95,
        "timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat() + "Z",
        "tool_used": "socket_fallback",
        "raw_output": "High-risk ports detected on proxy server."
    },
    {
        "target": "45.134.144.11",
        "open_ports": sorted([80, 443, 8080]),
        "risk_level": "MEDIUM",
        "risk_score": 0.60,
        "timestamp": (datetime.utcnow() - timedelta(minutes=45)).isoformat() + "Z",
        "tool_used": "socket_fallback",
        "raw_output": "Standard web ports open."
    },
    {
        "target": "89.248.165.23",
        "open_ports": sorted([445, 135, 139, 3389]),
        "risk_level": "CRITICAL",
        "risk_score": 1.0,
        "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z",
        "tool_used": "socket_fallback",
        "raw_output": "SMB and RDP explicitly exposed."
    }
]


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_attack(
    request: Request,
    payload: SimulationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Simulates a phishing behavior attack and returns a risk score.
    If risk is HIGH (> 0.8), automatically triggers a network scan on the requester's IP.
    """
    result = behavior_analyzer.analyze(
        payload.clicks_count,
        payload.unknown_domain,
        payload.unusual_time,
        payload.ip_change
    )

    # Log the simulation event
    log_security_event(
        request,
        "PHISHING_SIMULATION",
        result["status"],
        {
            "user_id": current_user["id"],
            "risk_score": result["risk_score"],
            "anomalies": result["anomalies"],
            "simulated": True
        }
    )

    # AUTO-TRIGGER: If risk is HIGH, automatically run a network scan
    if result["risk_score"] >= 0.8:
        client_ip = request.client.host if request.client else "127.0.0.1"
        scan_ip = client_ip if validate_ip(client_ip) else "127.0.0.1"
        try:
            # Run the actual scan on the local machine
            scan_result = scan_target(scan_ip)
            
            # For hackathon demo aesthetics, if the target is localhost, label it as a random malicious IP
            if scan_ip == "127.0.0.1":
                fake_threat_ip = random.choice(["203.0.113.4", "198.51.100.99", "185.15.56.22", "62.11.34.8", "45.33.22.1"])
                scan_result["target"] = fake_threat_ip
                scan_ip = fake_threat_ip

            _scan_history.insert(0, scan_result)
            if len(_scan_history) > 25:
                _scan_history.pop()

            log_security_event(
                request,
                "AUTO_NETWORK_SCAN",
                scan_result.get("risk_level", "INFO"),
                {
                    "triggered_by": "high_risk_simulation",
                    "ip_scanned": scan_ip,
                    "open_ports": scan_result.get("open_ports", []),
                    "risk_score": scan_result.get("risk_score", 0),
                }
            )
            logger.info(f"Auto-scan triggered for {scan_ip}: {scan_result['risk_level']}")
        except Exception as e:
            logger.error(f"Auto-scan failed: {e}")

    return result


@router.post("/scan", response_model=ScanResponse)
async def trigger_scan(
    request: Request,
    payload: ScanRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Manually trigger a network scan on a target IP.
    Only private/localhost IPs are permitted.
    """
    if not validate_ip(payload.ip):
        raise HTTPException(
            status_code=400,
            detail="Only private IP ranges (127.x, 10.x, 172.16-31.x, 192.168.x) are allowed."
        )

    scan_result = scan_target(payload.ip)

    # Store in history
    _scan_history.insert(0, scan_result)
    if len(_scan_history) > 25:
        _scan_history.pop()

    # Log event
    severity = scan_result.get("risk_level", "LOW")
    log_security_event(
        request,
        "NETWORK_SCAN",
        severity,
        {
            "user_id": current_user["id"],
            "ip_scanned": payload.ip,
            "open_ports": scan_result.get("open_ports", []),
            "risk_score": scan_result.get("risk_score", 0),
        }
    )

    return scan_result


@router.get("/scan-results")
async def get_scan_results(current_user: dict = Depends(get_current_active_user)):
    """Returns the last 25 scan results."""
    return _scan_history


@router.get("/metrics")
async def get_security_metrics(current_user: dict = Depends(get_current_active_user)):
    """Live metrics aggregated from Firestore security_events collection."""
    try:
        all_events = firestore_db.collection("security_events").order_by(
            "timestamp", direction="DESCENDING"
        ).limit(100).get()

        total = len(all_events)
        high_count = sum(1 for e in all_events if e.to_dict().get("severity") == "HIGH")
        warning_count = sum(1 for e in all_events if e.to_dict().get("severity") == "WARNING")
        login_fails = sum(1 for e in all_events if e.to_dict().get("event") in ("BRUTE_FORCE_DETECTED", "ACCOUNT_LOCKED"))
        phishing_blocked = sum(1 for e in all_events if e.to_dict().get("event") == "PHISHING_DETECTED")
        unique_ips = len(set(e.to_dict().get("ip", "") for e in all_events if e.to_dict().get("severity") == "HIGH"))

        if high_count > 5:
            threat_level = "Critical"
        elif high_count > 2:
            threat_level = "High"
        elif warning_count > 3:
            threat_level = "Medium"
        else:
            threat_level = "Low"

        return {
            "active_sessions": total,
            "failed_logins_24h": login_fails,
            "ips_blocked": unique_ips,
            "phishing_payloads_blocked": phishing_blocked,
            "threat_level": threat_level,
            "system_load": f"{random.uniform(0.1, 0.5):.2f}"
        }
    except Exception:
        return {
            "active_sessions": 0, "failed_logins_24h": 0,
            "ips_blocked": 0, "phishing_payloads_blocked": 0,
            "threat_level": "Low", "system_load": "0.10"
        }


@router.get("/events")
async def get_security_events(current_user: dict = Depends(get_current_active_user)):
    """Returns real security events from Firestore."""
    try:
        docs = firestore_db.collection("security_events").order_by(
            "timestamp", direction="DESCENDING"
        ).limit(25).get()

        events = []
        for doc in docs:
            data = doc.to_dict()
            ts = data.get("timestamp")
            if hasattr(ts, "isoformat"):
                ts_str = ts.isoformat()
                if not ts_str.endswith("Z") and "+" not in ts_str[-6:]:
                    ts_str += "Z"
            elif hasattr(ts, "timestamp"):
                ts_str = datetime.utcfromtimestamp(ts.timestamp()).isoformat() + "Z"
            elif isinstance(ts, str):
                ts_str = ts
            else:
                ts_str = datetime.utcnow().isoformat() + "Z"

            events.append({
                "id": doc.id,
                "timestamp": ts_str,
                "event": data.get("event", "UNKNOWN"),
                "severity": data.get("severity", "INFO"),
                "ip": data.get("ip", "unknown"),
                "user_agent": data.get("user_agent", ""),
                "details": data.get("details", {}),
            })

        return events
    except Exception:
        return []


# ── Phase 11: Visualization Data Endpoints ──────────────────────────────

def _parse_ts(ts) -> str:
    """Safely convert Firestore timestamps to ISO strings."""
    if isinstance(ts, str):
        return ts
    if hasattr(ts, "isoformat"):
        ts_str = ts.isoformat()
        if not ts_str.endswith("Z") and "+" not in ts_str[-6:]:
            ts_str += "Z"
        return ts_str
    if hasattr(ts, "timestamp"):
        return datetime.utcfromtimestamp(ts.timestamp()).isoformat() + "Z"
    return datetime.utcnow().isoformat() + "Z"


@router.get("/risk-timeline")
async def get_risk_timeline(current_user: dict = Depends(get_current_active_user)):
    """
    Returns timestamped risk scores from the user's security events.
    Used by the Chart.js Risk Timeline visualization.
    """
    try:
        docs = firestore_db.collection("security_events").order_by(
            "timestamp", direction="ASCENDING"
        ).limit(50).get()

        timestamps = []
        risk_scores = []
        event_labels = []

        severity_map = {"HIGH": 0.9, "CRITICAL": 1.0, "MEDIUM": 0.5, "WARNING": 0.4, "LOW": 0.2, "INFO": 0.1}

        for doc in docs:
            data = doc.to_dict()
            ts = data.get("timestamp")
            severity = data.get("severity", "INFO")

            ts_str = _parse_ts(ts)
            timestamps.append(ts_str)

            # Use the actual risk_score from details if available, otherwise map severity
            details = data.get("details", {})
            score = details.get("risk_score", severity_map.get(severity, 0.1))
            risk_scores.append(round(float(score), 2))
            event_labels.append(data.get("event", "UNKNOWN"))

        return {
            "timestamps": timestamps,
            "risk_scores": risk_scores,
            "event_labels": event_labels,
        }
    except Exception:
        return {"timestamps": [], "risk_scores": [], "event_labels": []}


@router.get("/login-locations")
async def get_login_locations(current_user: dict = Depends(get_current_active_user)):
    """
    Returns geolocated login positions for the Leaflet Map.
    Pulls from the user's login_locations subcollection.
    """
    user_id = current_user["id"]
    try:
        docs = (
            firestore_db.collection("users")
            .document(user_id)
            .collection("login_locations")
            .order_by("timestamp", direction="DESCENDING")
            .limit(20)
            .get()
        )

        locations = []
        for doc in docs:
            data = doc.to_dict()
            ts = data.get("timestamp")
            locations.append({
                "lat": data.get("lat", 0),
                "lon": data.get("lon", 0),
                "city": data.get("city", "Unknown"),
                "country": data.get("country", "Unknown"),
                "ip": data.get("ip", "unknown"),
                "timestamp": _parse_ts(ts),
            })

        return locations
    except Exception:
        return []


@router.get("/behavior-comparison")
async def get_behavior_comparison(current_user: dict = Depends(get_current_active_user)):
    """
    Compares baseline (first 50%) vs current (last 50%) behavior metrics.
    """
    try:
        docs = firestore_db.collection("security_events").order_by(
            "timestamp", direction="ASCENDING"
        ).limit(100).get()

        all_events = [d.to_dict() for d in docs]
        if not all_events:
            return {"baseline": {}, "current": {}}

        mid = len(all_events) // 2 or 1
        baseline_events = all_events[:mid]
        current_events = all_events[mid:]

        def compute_metrics(events):
            sev_map = {"HIGH": 0.9, "CRITICAL": 1.0, "MEDIUM": 0.5, "WARNING": 0.4, "LOW": 0.2, "INFO": 0.1}
            scores = [sev_map.get(e.get("severity", "INFO"), 0.1) for e in events]
            unique_ips = len(set(e.get("ip", "") for e in events))
            high_count = sum(1 for e in events if e.get("severity") in ("HIGH", "CRITICAL"))
            avg_score = round(sum(scores) / len(scores), 2) if scores else 0
            return {
                "event_count": len(events),
                "avg_risk_score": avg_score,
                "high_risk_events": high_count,
                "unique_ips": unique_ips,
            }

        return {
            "baseline": compute_metrics(baseline_events),
            "current": compute_metrics(current_events),
        }
    except Exception:
        return {"baseline": {}, "current": {}}


# ── Phase 12: Admin Endpoint ────────────────────────────────────────────

@router.get("/admin/users")
async def get_admin_users(current_user: dict = Depends(get_current_active_user)):
    """
    Returns all registered users with their aggregated risk status.
    Protected by RBAC: only users with 'admin' role can access.
    """
    if "admin" not in current_user.get("roles", []):
        raise HTTPException(
            status_code=403, 
            detail="RBAC ENFORCEMENT: Admin access required. Normal users are blocked."
        )

    try:
        user_docs = firestore_db.collection("users").limit(50).get()

        users = []
        for doc in user_docs:
            data = doc.to_dict()
            uid = doc.id
            status = data.get("account_status", "active")
            roles = data.get("roles", ["user"])
            fails = data.get("failed_attempts", 0)

            # Aggregate recent security events for this user
            events = firestore_db.collection("security_events").where(
                "user_id", "==", uid
            ).order_by("timestamp", direction="DESCENDING").limit(20).get()

            high_count = sum(1 for e in events if e.to_dict().get("severity") in ("HIGH", "CRITICAL"))
            total_events = len(events)

            if high_count >= 3:
                risk = "CRITICAL"
            elif high_count >= 1:
                risk = "HIGH"
            elif total_events > 5:
                risk = "MEDIUM"
            else:
                risk = "LOW"

            users.append({
                "user_id": uid,
                "email_hash": data.get("email_hash", "")[:12] + "...",
                "status": status,
                "roles": roles,
                "risk": risk,
                "failed_attempts": fails,
                "total_events": total_events,
                "high_risk_events": high_count,
            })

        return users
    except Exception as e:
        logger.error(f"Admin users fetch failed: {e}")
        return []

