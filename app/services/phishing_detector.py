import re
from typing import Dict, List, Any

class PhishingDetector:
    URGENCY_KEYWORDS = ["urgent", "immediately", "verify now", "act now", "limited time"]
    CREDENTIAL_KEYWORDS = ["confirm password", "enter ssn", "routing number"]
    SUSPICIOUS_PHRASES = ["click here", "winner", "account suspended"]
    URL_REGEX = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
    SHORTENED_DOMAINS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl"]

    def __init__(self):
        pass

    def extract_urls(self, text: str) -> List[str]:
        return self.URL_REGEX.findall(text)

    def analyze(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        urls = self.extract_urls(text)
        
        keyword_score = 0.0
        threats = []
        for word in self.URGENCY_KEYWORDS:
            if word in text_lower:
                keyword_score += 0.25
                threats.append(f"Urgency keyword: {word}")
                
        for word in self.CREDENTIAL_KEYWORDS:
            if word in text_lower:
                keyword_score += 0.25
                threats.append(f"Credential request: {word}")
                
        for phrase in self.SUSPICIOUS_PHRASES:
            if phrase in text_lower:
                keyword_score += 0.15
                threats.append(f"Suspicious phrase: {phrase}")

        url_score = 0.0
        for url in urls:
            if any(domain in url for domain in self.SHORTENED_DOMAINS):
                url_score += 0.4
                threats.append(f"Shortened URL detected: {url}")

        regex_score = 0.0
        if len(re.findall(r'[A-Z]{4,}', text)) > 3:
            regex_score += 0.1
            threats.append("Excessive capitalization")

        final_score = min((keyword_score * 0.5) + (url_score * 0.4) + (regex_score * 0.1), 1.0)
        
        decision = "allowed"
        if final_score > 0.85:
            decision = "blocked"
        elif final_score >= 0.70:
            decision = "quarantined"
            
        return {
            "ml_score": min(keyword_score, 1.0),
            "url_reputation_score": min(url_score, 1.0),
            "regex_score": regex_score,
            "final_score": final_score,
            "decision": decision,
            "extracted_urls": urls,
            "threat_indicators": threats
        }

phishing_detector = PhishingDetector()
