"""
Auth dependency for StudyLoop.
Verifies Supabase JWTs and returns the authenticated user's id.
"""

from fastapi import Header, HTTPException
from jose import jwt, JWTError
import os

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET is not set — check your .env file")

def get_current_user(authorization: str = Header(...)) -> str:
    """
    Reads the Authorization: Bearer <token> header, verifies the
    Supabase JWT, and returns the user id (the 'sub' claim).
    Raises 401 if the token is missing, malformed, or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except (JWTError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    return user_id