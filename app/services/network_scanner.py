"""
Network Threat Scanner Service
Integrates with Nmap (when available) or uses socket-based fallback for port scanning.
Includes risk analysis logic for open ports and services.
"""
import subprocess
import socket
import json
import logging
import re
import ipaddress
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger("network_scanner")

# --- Security: Allowed IP Ranges (private + localhost only) ---
ALLOWED_RANGES = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
]

# --- Risk Classification ---
HIGH_RISK_PORTS = {
    21: ("FTP", "Unencrypted file transfer — credential theft risk"),
    23: ("Telnet", "Unencrypted remote access — critical vulnerability"),
    25: ("SMTP", "Mail relay — potential spam/phishing vector"),
    135: ("MSRPC", "Windows RPC — lateral movement risk"),
    139: ("NetBIOS", "Legacy Windows sharing — worm propagation vector"),
    445: ("SMB", "Server Message Block — ransomware attack surface"),
    1433: ("MSSQL", "Database exposed — SQL injection risk"),
    3306: ("MySQL", "Database exposed — data exfiltration risk"),
    3389: ("RDP", "Remote Desktop — brute force target"),
    5432: ("PostgreSQL", "Database exposed — unauthorized access risk"),
    5900: ("VNC", "Remote framebuffer — screen capture risk"),
    6379: ("Redis", "In-memory DB — unauthenticated access risk"),
    27017: ("MongoDB", "NoSQL DB — default no-auth config risk"),
}

MEDIUM_RISK_PORTS = {
    8080: ("HTTP-Alt", "Alternate HTTP — possible dev/proxy server"),
    8443: ("HTTPS-Alt", "Alternate HTTPS — possible staging server"),
    9090: ("WebApp", "Web application — potential admin panel"),
    9200: ("Elasticsearch", "Search engine — data exposure risk"),
    11211: ("Memcached", "Cache server — amplification attack vector"),
}

SAFE_PORTS = {
    22: ("SSH", "Encrypted remote access"),
    80: ("HTTP", "Standard web server"),
    443: ("HTTPS", "Encrypted web server"),
    53: ("DNS", "Domain name resolution"),
    993: ("IMAPS", "Encrypted mail"),
    995: ("POP3S", "Encrypted mail"),
}

# Common ports to scan
SCAN_PORTS = sorted(set(
    list(HIGH_RISK_PORTS.keys()) +
    list(MEDIUM_RISK_PORTS.keys()) +
    list(SAFE_PORTS.keys()) +
    [8000, 8001, 8888, 4443, 5000, 5173, 5174]
))


def validate_ip(ip: str) -> bool:
    """Ensure the IP is within allowed private ranges."""
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in net for net in ALLOWED_RANGES)
    except ValueError:
        return False


def _try_nmap_scan(ip: str) -> Optional[Dict[str, Any]]:
    """Attempt a real Nmap scan. Returns None if nmap is not installed."""
    try:
        result = subprocess.run(
            ["nmap", "-sV", "-F", "--open", ip],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            return None

        output = result.stdout
        open_ports = []
        services = []

        # Parse nmap output lines like: "22/tcp open ssh OpenSSH 8.9"
        for line in output.splitlines():
            match = re.match(r"(\d+)/tcp\s+open\s+(\S+)\s*(.*)", line)
            if match:
                port = int(match.group(1))
                service = match.group(2)
                version = match.group(3).strip()
                open_ports.append(port)
                services.append({
                    "port": port,
                    "service": service,
                    "version": version or "unknown"
                })

        return {"open_ports": open_ports, "services": services, "method": "nmap"}
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def _socket_scan(ip: str) -> Dict[str, Any]:
    """Fallback: scan common ports using raw sockets."""
    open_ports = []
    services = []

    for port in SCAN_PORTS:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                if s.connect_ex((ip, port)) == 0:
                    open_ports.append(port)
                    # Identify service from our known lists
                    if port in HIGH_RISK_PORTS:
                        name, _ = HIGH_RISK_PORTS[port]
                    elif port in MEDIUM_RISK_PORTS:
                        name, _ = MEDIUM_RISK_PORTS[port]
                    elif port in SAFE_PORTS:
                        name, _ = SAFE_PORTS[port]
                    else:
                        name = "unknown"
                    services.append({
                        "port": port,
                        "service": name.lower(),
                        "version": "detected"
                    })
        except (socket.error, OSError):
            continue

    return {"open_ports": open_ports, "services": services, "method": "socket"}


def analyze_risk(open_ports: List[int]) -> Dict[str, Any]:
    """Classify risk based on open ports."""
    anomalies = []
    high_risk_found = []
    medium_risk_found = []
    safe_found = []

    for port in open_ports:
        if port in HIGH_RISK_PORTS:
            name, desc = HIGH_RISK_PORTS[port]
            high_risk_found.append(port)
            anomalies.append(f"🔴 Port {port} ({name}): {desc}")
        elif port in MEDIUM_RISK_PORTS:
            name, desc = MEDIUM_RISK_PORTS[port]
            medium_risk_found.append(port)
            anomalies.append(f"🟡 Port {port} ({name}): {desc}")
        elif port in SAFE_PORTS:
            name, desc = SAFE_PORTS[port]
            safe_found.append(port)

    # Risk scoring
    if len(high_risk_found) >= 2 or len(open_ports) > 10:
        risk_level = "CRITICAL"
        risk_score = min(1.0, 0.7 + len(high_risk_found) * 0.1)
    elif len(high_risk_found) >= 1:
        risk_level = "HIGH"
        risk_score = 0.7 + len(high_risk_found) * 0.05
    elif len(medium_risk_found) >= 2 or len(open_ports) > 5:
        risk_level = "MEDIUM"
        risk_score = 0.4 + len(medium_risk_found) * 0.1
    elif len(open_ports) > 0:
        risk_level = "LOW"
        risk_score = 0.1 + len(open_ports) * 0.05
    else:
        risk_level = "CLEAN"
        risk_score = 0.0
        anomalies.append("✅ No open ports detected — host appears secure")

    if len(open_ports) > 8:
        anomalies.insert(0, f"⚠ Unusually high number of open ports: {len(open_ports)}")

    return {
        "risk_level": risk_level,
        "risk_score": round(min(risk_score, 1.0), 2),
        "anomalies": anomalies,
        "high_risk_ports": high_risk_found,
        "medium_risk_ports": medium_risk_found,
        "safe_ports": safe_found,
    }


def scan_target(ip: str) -> Dict[str, Any]:
    """
    Main entry point: validate IP, scan ports, analyze risk.
    Tries Nmap first, falls back to socket scanning.
    """
    if not validate_ip(ip):
        return {
            "ip": ip,
            "status": "REJECTED",
            "error": "IP address is outside allowed private ranges. Only localhost and private IPs (10.x, 172.16-31.x, 192.168.x) are permitted.",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    # Try nmap first, fallback to socket scan
    scan_result = _try_nmap_scan(ip)
    if scan_result is None:
        scan_result = _socket_scan(ip)

    risk = analyze_risk(scan_result["open_ports"])

    host_status = "up" if scan_result["open_ports"] else "filtered/down"

    return {
        "ip": ip,
        "status": risk["risk_level"],
        "host_status": host_status,
        "scan_method": scan_result["method"],
        "open_ports": scan_result["open_ports"],
        "services": scan_result["services"],
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "anomalies": risk["anomalies"],
        "high_risk_ports": risk["high_risk_ports"],
        "medium_risk_ports": risk["medium_risk_ports"],
        "safe_ports": risk["safe_ports"],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
