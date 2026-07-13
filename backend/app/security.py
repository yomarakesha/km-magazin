"""Password hashing for admin users.

Uses stdlib PBKDF2-HMAC-SHA256 (no external dependency — bcrypt/argon2 are
not reliably installable in this environment). Format:
    pbkdf2$<iterations>$<salt_hex>$<hash_hex>
"""
import hashlib
import hmac
import secrets

_ITERATIONS = 240_000  # OWASP 2023 recommendation for PBKDF2-SHA256


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password_hash(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_hex, hash_hex = stored.split("$")
        if scheme != "pbkdf2":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), hash_hex)
    except (ValueError, TypeError):
        return False
