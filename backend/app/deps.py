"""
Auth dependency for StudyLoop.
Verifies Supabase JWTs using Supabase's public JWKS (asymmetric ES256
signing) rather than a shared HMAC secret -- Supabase's newer projects
sign with the JWT Signing Keys system, not the legacy shared secret.
"""

import os
import time

import requests
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SUPABASE_URL = os.environ.get("SUPABASE_URL")
if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is not set — check your .env file")

JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
JWKS_CACHE_TTL_SECONDS = 3600

_bearer_scheme = HTTPBearer()

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0.0


def _get_jwks() -> dict:
    """Fetches and caches Supabase's public JWKS. Refreshes hourly so a
    key rotation on Supabase's side doesn't require a redeploy here."""
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache is None or (now - _jwks_cache_time) > JWKS_CACHE_TTL_SECONDS:
        response = requests.get(JWKS_URL, timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = now
    return _jwks_cache


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)) -> str:
    """
    Verifies the Supabase JWT from the Authorization: Bearer <token>
    header using Supabase's public key (ES256), and returns the user id
    (the 'sub' claim). Raises 401 if the token is missing, malformed,
    invalid, or signed with a key not found in Supabase's JWKS.
    """
    token = credentials.credentials

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        jwks = _get_jwks()
        matching_key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
        if matching_key is None:
            raise HTTPException(status_code=401, detail="Token signed with unknown key")

        payload = jwt.decode(
            token,
            matching_key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    return user_id