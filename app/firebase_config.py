# Firebase Admin SDK Configuration
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

# We expect a service application credentials JSON file in the root directory
# For production, you could also construct this from environment variables
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "serviceAccountKey.json")

def initialize_firebase():
    """Initialize the Firebase Admin SDK if not already initialized."""
    if not firebase_admin._apps:
        try:
            if os.path.exists(CREDENTIALS_PATH):
                cred = credentials.Certificate(CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            else:
                # Fallback to default credentials (e.g., if hosted on Google Cloud)
                # Or print a warning for the developer
                print(f"WARNING: '{CREDENTIALS_PATH}' not found. Falling back to application default credentials.")
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"Failed to initialize Firebase Admin SDK: {e}")

# Initialize upon module import
initialize_firebase()

# Export the Firestore database client and Auth module
db = firestore.client()
firebase_auth = auth
