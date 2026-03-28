import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from src.config import settings

class CryptoService:
    def __init__(self):
        # Master key should be 32 bytes for AES-256
        self.master_key = base64.b64decode(settings.ENCRYPTION_MASTER_KEY)
        self.aesgcm = AESGCM(self.master_key)

    def encrypt_field(self, plaintext: str) -> str:
        """Encrypts a string using AES-256-GCM and returns a base64 encoded string with IV."""
        if not plaintext:
            return None
        
        iv = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(iv, plaintext.encode(), None)
        return base64.b64encode(iv + ciphertext).decode('utf-8')

    def decrypt_field(self, ciphertext_b64: str) -> str:
        """Decrypts a base64 encoded string containing IV + ciphertext."""
        if not ciphertext_b64:
            return None
        
        data = base64.b64decode(ciphertext_b64)
        iv = data[:12]
        ciphertext = data[12:]
        plaintext = self.aesgcm.decrypt(iv, ciphertext, None)
        return plaintext.decode('utf-8')

    def derive_key(self, context: str) -> bytes:
        """Derive a specific data key from the master key using HKDF."""
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=context.encode(),
        )
        return hkdf.derive(self.master_key)

    def hmac_sign(self, data: str) -> str:
        """Create a signature for data integrity (simple example)."""
        import hmac
        import hashlib
        return hmac.new(self.master_key, data.encode(), hashlib.sha256).hexdigest()

    def hmac_verify(self, data: str, signature: str) -> bool:
        """Verify the integrity signature."""
        return hmac.compare_digest(self.hmac_sign(data), signature)

crypto_service = CryptoService()
