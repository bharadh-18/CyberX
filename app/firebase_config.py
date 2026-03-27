# Firebase Admin SDK Configuration
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth

# We expect a service application credentials JSON file in the root directory
# For production, you could also construct this from environment variables
CREDENTIALS_PATH_LOCAL = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")
CREDENTIALS_PATH_RENDER = "/etc/secrets/serviceAccountKey.json"

def get_credentials_path():
    if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ and os.path.exists(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]):
        return os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    if os.path.exists(CREDENTIALS_PATH_RENDER):
        return CREDENTIALS_PATH_RENDER
    if os.path.exists(CREDENTIALS_PATH_LOCAL):
        return CREDENTIALS_PATH_LOCAL
    return None
def initialize_firebase():
    """Initialize the Firebase Admin SDK if not already initialized."""
    if not firebase_admin._apps:
        try:
            # First, try to read raw JSON credentials directly from environment
            if "FIREBASE_CREDENTIALS_JSON" in os.environ and os.environ["FIREBASE_CREDENTIALS_JSON"].strip():
                print("Loading Firebase credentials from Render FIREBASE_CREDENTIALS_JSON environment variable.")
                cred_dict = json.loads(os.environ["FIREBASE_CREDENTIALS_JSON"])
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            else:
                cred_path = get_credentials_path()
                if cred_path:
                    print(f"Loading Firebase credentials from file: {cred_path}")
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                else:
                    # Fallback to default credentials (e.g., if hosted on Google Cloud)
                    print(f"WARNING: No serviceAccountKey.json found. Falling back to application default credentials.")
                    firebase_admin.initialize_app()
        except Exception as e:
            print(f"Failed to initialize Firebase Admin SDK: {e}")

# Initialize upon module import
initialize_firebase()

# Export the Firestore database client and Auth module
db = firestore.client()
firebase_auth = auth
