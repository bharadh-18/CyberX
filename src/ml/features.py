import re
from typing import Dict

# Common phishing indicators
URGENCY_KEYWORDS = [
    "urgent", "immediate action", "verify account", "suspended",
    "required immediately", "last warning", "account closed",
    "password expiration", "unauthorized access"
]

CREDENTIAL_HARVESTING = [
    "confirm password", "update payment", "login here",
    "click here to verify", "account details required"
]

def extract_features(text: str, url: str = None) -> Dict[str, float]:
    """
    Extracts heuristic features from text and URL for the ML model.
    Returns a dictionary of raw feature counts and boolean flags as floats.
    """
    text_lower = text.lower()
    features = {}
    
    # 1. Linguistic Heuristics
    urgency_count = sum(1 for kw in URGENCY_KEYWORDS if kw in text_lower)
    harvesting_count = sum(1 for kw in CREDENTIAL_HARVESTING if kw in text_lower)
    
    features["urgency_keyword_count"] = float(urgency_count)
    features["credential_harvesting_count"] = float(harvesting_count)
    
    # 2. Structural Analysis
    # Count of standard HTML/link indicators in text
    features["link_count"] = float(text_lower.count("http://") + text_lower.count("https://"))
    features["has_password_form"] = 1.0 if "password" in text_lower and "<form" in text_lower else 0.0
    
    # 3. URL Reputation / Analysis (if provided)
    if url:
        url_lower = url.lower()
        # Shorteners
        shorteners = ["bit.ly", "tinyurl", "t.co", "ow.ly", "goo.gl"]
        is_shortened = any(short in url_lower for short in shorteners)
        features["is_url_shortened"] = 1.0 if is_shortened else 0.0
        
        # Typosquatting / Homograph heuristics (simplified)
        # Check for multiple hyphens or suspicious domains mimicking legit ones
        suspicious_patterns = [
            "paypal-", "apple-", "support-", "login-", "security-",
            ".ru/", ".cn/", ".top/", ".xyz/", ".info/"
        ]
        is_suspicious = any(pat in url_lower for pat in suspicious_patterns)
        features["has_suspicious_url_pattern"] = 1.0 if is_suspicious else 0.0
        
        # IP address instead of domain
        has_ip = re.search(r"http[s]?://[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}", url_lower)
        features["url_uses_ip"] = 1.0 if has_ip else 0.0
    else:
        features["is_url_shortened"] = 0.0
        features["has_suspicious_url_pattern"] = 0.0
        features["url_uses_ip"] = 0.0
        
    return features
