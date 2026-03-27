"""
Real-Time ML Phishing Detector
Uses Scikit-Learn TF-IDF + LogisticRegression for genuine text classification.
Trained on startup with a curated dataset of phishing vs. safe text samples.
"""
import re
import math
import logging
from typing import Dict, List, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import numpy as np

logger = logging.getLogger("security_logger")

# Training dataset: Real-world phishing indicators vs. safe messages
TRAINING_DATA = [
    # ---- PHISHING / MALICIOUS (label=1) ----
    ("URGENT: Your account has been suspended. Click here to verify immediately: http://bit.ly/x3kd9", 1),
    ("Congratulations! You are the winner of $10,000. Enter your SSN to claim now.", 1),
    ("Your PayPal account is limited. Confirm password at http://paypa1-secure.tk/login", 1),
    ("Act now! Your Netflix subscription expires. Verify at http://tinyurl.com/nflx-renew", 1),
    ("ALERT: Unusual login detected. Verify your identity immediately at http://goo.gl/a3bc", 1),
    ("Dear customer, confirm your routing number and SSN to unlock your bank account.", 1),
    ("Limited time offer! Click here to win a free iPhone: http://bit.ly/free-phone", 1),
    ("Your Amazon order #38291 has been cancelled. Click here to dispute: http://amaz0n-help.com/verify", 1),
    ("WARNING: Your email will be deactivated. Enter your password now to prevent this.", 1),
    ("Congratulations winner! You have been selected. Act now before this offer expires!", 1),
    ("Security Alert: We detected suspicious activity. Verify now at http://t.co/sec-check", 1),
    ("Your account will be locked in 24 hours unless you confirm password immediately.", 1),
    ("FREE gift card! Claim your $500 Walmart gift card: http://bit.ly/walmart-free", 1),
    ("URGENT NOTICE: Your tax refund is pending. Enter SSN to process: http://irs-refund.tk", 1),
    ("Hello, I am a prince from Nigeria. Send me your bank details for $5M transfer.", 1),
    # ---- SAFE / LEGITIMATE (label=0) ----
    ("Hi team, the meeting has been rescheduled to 3pm tomorrow. Please update your calendars.", 0),
    ("Your order #12345 has been shipped. Track it at https://ups.com/track/12345", 0),
    ("Reminder: Your dentist appointment is on Friday at 10am.", 0),
    ("The quarterly report is attached. Please review before the Monday meeting.", 0),
    ("Happy birthday! Hope you have a wonderful day with your family.", 0),
    ("Here are the meeting notes from today's standup. Action items are listed below.", 0),
    ("The code review for PR #42 is ready. Please take a look when you have time.", 0),
    ("Thanks for your purchase! Your receipt is attached. No action required.", 0),
    ("Project update: We completed sprint 5. Demo is scheduled for Thursday.", 0),
    ("Hi, I wanted to follow up on our conversation about the new feature requirements.", 0),
    ("The server maintenance window is scheduled for Saturday 2am-4am UTC.", 0),
    ("Please find the updated design mockups in the shared Google Drive folder.", 0),
    ("Lunch order reminder: Please submit your choice by 11am today.", 0),
    ("The new office policy document has been uploaded to the company intranet.", 0),
    ("Great job on the presentation yesterday! The client was impressed.", 0),
]

# URL pattern matching
URL_REGEX = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
SHORTENED_DOMAINS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "buff.ly"]
SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".buzz"]

# BEC (Business Email Compromise) keyword sets for co-occurrence detection
BEC_AUTHORITY_KEYWORDS = [
    "ceo", "cfo", "cto", "coo", "director", "president", "chairman",
    "urgent", "confidential", "sensitive", "immediately", "asap",
    "do not share", "keep this quiet", "between us", "meeting",
    "executive", "management", "board", "leadership"
]
BEC_FINANCIAL_KEYWORDS = [
    "wire transfer", "bank transfer", "invoice", "payment",
    "gift card", "gift cards", "itunes", "amazon card",
    "routing number", "account number", "iban", "swift",
    "bitcoin", "crypto", "wallet address",
    "purchase", "funds", "budget", "reimburse", "reimbursement",
    "vendor", "supplier", "payroll"
]
BEC_PENALTY = 0.35

# Trusted domains — high-authority sites that should never trigger false positives
TRUSTED_DOMAINS = [
    # Search & Tech
    "google.com", "google.co.in", "google.co.uk", "googleapis.com", "gstatic.com",
    "microsoft.com", "live.com", "office.com", "azure.com", "windows.com",
    "apple.com", "icloud.com",
    "amazon.com", "amazonaws.com", "aws.amazon.com",
    "github.com", "github.io", "gitlab.com",
    "stackoverflow.com", "stackexchange.com",
    # Social
    "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
    "youtube.com", "reddit.com", "discord.com", "whatsapp.com",
    # Finance
    "paypal.com", "stripe.com", "chase.com", "bankofamerica.com",
    # Cloud / Dev
    "firebase.google.com", "firebaseapp.com", "vercel.app", "netlify.app",
    "heroku.com", "cloudflare.com", "digitalocean.com",
    # Email
    "gmail.com", "outlook.com", "yahoo.com", "protonmail.com",
    # Other
    "wikipedia.org", "medium.com", "notion.so", "figma.com",
    "zoom.us", "slack.com", "dropbox.com", "twitch.tv",
    "netflix.com", "spotify.com", "adobe.com",
]


class PhishingDetector:
    def __init__(self):
        logger.info("Initializing ML Phishing Detection Pipeline...")
        texts = [t for t, _ in TRAINING_DATA]
        labels = [l for _, l in TRAINING_DATA]

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                stop_words="english",
                sublinear_tf=True
            )),
            ("clf", LogisticRegression(
                C=1.0,
                max_iter=1000,
                class_weight="balanced"
            ))
        ])
        self.pipeline.fit(texts, labels)
        logger.info("ML Phishing Pipeline trained successfully on %d samples.", len(texts))

    def extract_urls(self, text: str) -> List[str]:
        return URL_REGEX.findall(text)

    def _url_reputation_score(self, urls: List[str]) -> tuple:
        """Analyze extracted URLs for shortened links and suspicious TLDs."""
        score = 0.0
        threats = []
        for url in urls:
            for domain in SHORTENED_DOMAINS:
                if domain in url:
                    score += 0.35
                    threats.append(f"Shortened URL: {url}")
                    break
            for tld in SUSPICIOUS_TLDS:
                if url.endswith(tld) or tld + "/" in url:
                    score += 0.30
                    threats.append(f"Suspicious TLD: {url}")
                    break
        return min(score, 1.0), threats

    def _check_whitelist(self, urls: List[str]) -> tuple:
        """Check if all URLs belong to trusted high-authority domains."""
        if not urls:
            return False, []
        trust_factors = []
        all_trusted = True
        for url in urls:
            url_lower = url.lower()
            is_trusted = False
            for domain in TRUSTED_DOMAINS:
                if domain in url_lower:
                    is_trusted = True
                    trust_factors.append(f"✓ Trusted domain: {domain}")
                    break
            if not is_trusted:
                all_trusted = False
        return all_trusted, trust_factors

    def _regex_heuristic_score(self, text: str) -> tuple:
        """Pattern-based heuristics for additional signal."""
        score = 0.0
        threats = []
        caps_count = len(re.findall(r'[A-Z]{4,}', text))
        if caps_count > 2:
            score += 0.15 * min(caps_count, 5)
            threats.append(f"Excessive capitalization ({caps_count} instances)")
        exclaim_count = text.count("!")
        if exclaim_count > 3:
            score += 0.10
            threats.append(f"Excessive exclamation marks ({exclaim_count})")
        if re.search(r'\b(ssn|social security|routing number|bank account)\b', text.lower()):
            score += 0.30
            threats.append("PII solicitation detected")
        return min(score, 1.0), threats

    def _bec_heuristic(self, text: str) -> tuple:
        """
        NLP heuristic for Business Email Compromise (BEC) detection.
        Scans for co-occurrence of Authority keywords and Financial intent keywords.
        Returns (is_bec: bool, matched_authorities: list, matched_financials: list)
        """
        text_lower = text.lower()
        matched_auth = [kw for kw in BEC_AUTHORITY_KEYWORDS if kw in text_lower]
        matched_fin = [kw for kw in BEC_FINANCIAL_KEYWORDS if kw in text_lower]
        is_bec = len(matched_auth) > 0 and len(matched_fin) > 0
        return is_bec, matched_auth, matched_fin

    def analyze(self, text: str) -> Dict[str, Any]:
        """Run the full ML + heuristic analysis pipeline."""
        urls = self.extract_urls(text)
        has_urls = len(urls) > 0

        # 1. ML Pipeline Score (TF-IDF + LogisticRegression probability)
        ml_proba = self.pipeline.predict_proba([text])[0]
        ml_score = float(ml_proba[1])  # Probability of being phishing

        # 2. URL Reputation Score
        url_score, url_threats = self._url_reputation_score(urls)

        # 3. Regex Heuristic Score (used for threat enrichment, not in final formula)
        regex_score, regex_threats = self._regex_heuristic_score(text)

        # 4. BEC (Business Email Compromise) Heuristic
        is_bec, bec_auth_matches, bec_fin_matches = self._bec_heuristic(text)
        bec_boosted = False
        if is_bec and not has_urls:
            # Apply BEC penalty to ML score before final calculation
            ml_score = min(ml_score + BEC_PENALTY, 1.0)
            bec_boosted = True
            logger.warning(
                f"BEC_DETECTED: authority={bec_auth_matches}, financial={bec_fin_matches}, "
                f"ml_score boosted by +{BEC_PENALTY}"
            )

        # 5. Domain Whitelist Check
        is_whitelisted, trust_factors = self._check_whitelist(urls)
        if is_whitelisted:
            url_score = -1.0  # Highly Trusted signal

        # 6. Dynamic Weighted Final Score
        #    If URLs exist:    Final = (ML × 0.8) + (URL × 0.2)
        #    If NO URLs exist:  Final = ML Score (100% weight to ML model)
        if has_urls:
            final_score = (ml_score * 0.80) + (max(url_score, 0.0) * 0.20)
        else:
            final_score = ml_score

        # Apply trust discount if whitelisted
        if is_whitelisted:
            final_score = max(0.0, final_score - 0.5)
            trust_factors.append(f"Trust discount applied: -0.50")

        final_score = min(final_score, 1.0)

        # 7. Zero-Day URL Detection
        #    Only trigger if URLs are NOT whitelisted
        is_zero_day = False
        if has_urls and not is_whitelisted and url_score == 0.0 and ml_score > 0.5:
            is_zero_day = True

        # 8. Decision Gate (CAUTION threshold raised to 0.45)
        if is_zero_day:
            decision = "zero_day"
        elif final_score > 0.6 or (ml_score > 0.6 and not is_whitelisted) or (url_score > 0.5):
            decision = "blocked"
        elif final_score > 0.45:
            decision = "warning"
        else:
            decision = "allowed"

        # 9. Assemble threat indicators
        all_threats = url_threats + regex_threats
        if bec_boosted:
            all_threats.insert(0, f"🏢 BEC Financial Intent Detected (authority: {', '.join(bec_auth_matches[:3])}, financial: {', '.join(bec_fin_matches[:3])})")
            all_threats.insert(1, f"BEC Penalty Applied: +{BEC_PENALTY} to ML score")
        if ml_score > 0.5:
            all_threats.insert(0, f"ML classifier confidence: {ml_score:.2%}")
        if is_zero_day:
            all_threats.insert(0, "⚠ POTENTIAL ZERO-DAY PHISH: Unknown URL with high ML suspicion")

        return {
            "ml_score": round(ml_score, 4),
            "url_reputation_score": round(url_score, 4),
            "regex_score": round(regex_score, 4),
            "final_score": round(final_score, 4),
            "decision": decision,
            "extracted_urls": urls,
            "threat_indicators": all_threats,
            "trust_factors": trust_factors,
            "bec_detected": bec_boosted
        }


# Singleton instance - trained once on import
phishing_detector = PhishingDetector()
