import firebase_admin
from firebase_admin import auth, credentials
import os
import json
import logging

logger = logging.getLogger("security_logger")

def initialize_firebase():
    """Initialize Firebase Admin SDK for ID token verification."""
    if not firebase_admin._apps:
        try:
            # 1. Try Environment Variable (best for Render/Cloud Run)
            cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
            if cred_json:
                logger.info("Initializing Firebase with JSON from environment.")
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                return

            # 2. Try local file path (fallback)
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")
            if os.path.exists(service_account_path):
                logger.info(f"Initializing Firebase with key file: {service_account_path}")
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                return

            # 3. Default (ADC - Application Default Credentials)
            logger.warning("No Firebase credentials found. Falling back to Application Default Credentials.")
            firebase_admin.initialize_app()
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

def verify_firebase_token(id_token: str):
    """Verify the Firebase ID token and return user claims."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        return None

# Auto-initialize on import
initialize_firebase()
