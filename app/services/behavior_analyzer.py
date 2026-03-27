import logging
from typing import Dict, List, Any

logger = logging.getLogger("security_logger")

class BehaviorAnalyzer:
    """
    Simulated AI Behavior Logic for Phishing Detection.
    Uses rule-based heuristics to mimic an anomaly detection model.
    """
    
    def analyze(self, clicks_count: int, unknown_domain: bool, unusual_time: bool, ip_change: bool) -> Dict[str, Any]:
        risk_score = 0.0
        anomalies = []
        
        # 1. Click Count Logic
        if clicks_count > 10:
            risk_score += 0.4
            anomalies.append("Extreme burst of link clicks detected")
        elif clicks_count > 5:
            risk_score += 0.2
            anomalies.append("Multiple suspicious link clicks")
            
        # 2. Domain Reputation
        if unknown_domain:
            risk_score += 0.3
            anomalies.append("Accessed high-risk/unknown domain")
            
        # 3. Temporal Anomaly
        if unusual_time:
            risk_score += 0.15
            anomalies.append("Activity detected during non-standard hours")
            
        # 4. Network Anomaly
        if ip_change:
            risk_score += 0.2
            anomalies.append("Rapid IP address change/Location shift")
            
        # Cap risk score at 1.0
        risk_score = min(risk_score, 1.0)
        
        # Classification
        if risk_score >= 0.8:
            status = "HIGH"
        elif risk_score >= 0.5:
            status = "MEDIUM"
        else:
            status = "LOW"
            
        return {
            "risk_score": round(risk_score, 2),
            "status": status,
            "anomalies": anomalies
        }

behavior_analyzer = BehaviorAnalyzer()
