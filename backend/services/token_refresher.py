"""
Google OAuth Token Refresher

Silently refreshes an expired Google access token using the stored refresh token.
Called by classroom_service and gmail_service before making API calls so that
the user never has to sign in again just because the 1-hour access token expired.

Requires:
  - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set as environment variables
    (these are the same OAuth2 credentials used for the Firebase/Google sign-in)

Flow:
  POST https://oauth2.googleapis.com/token
  grant_type=refresh_token&client_id=...&client_secret=...&refresh_token=...

  Returns: { access_token, expires_in, token_type, scope }
"""
import os
import logging
import requests
from sqlalchemy.orm import Session
from models import User

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def refresh_google_access_token(user: User, db: Session) -> str | None:
    """
    Attempts to refresh the user's Google access token using their stored refresh token.

    Returns the new access token string if successful, or None if it fails.
    Also persists the new token in the DB automatically.
    """
    if not user.google_refresh_token:
        logger.warning(f"[TokenRefresher] No refresh token stored for user {user.email}. User must sign in again.")
        return None

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        logger.error(
            "[TokenRefresher] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. "
            "Add them to Vercel environment variables."
        )
        return None

    try:
        resp = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": user.google_refresh_token,
            },
            timeout=10,
        )

        if resp.status_code != 200:
            logger.error(
                f"[TokenRefresher] Token refresh failed for {user.email}: "
                f"HTTP {resp.status_code} — {resp.text[:200]}"
            )
            return None

        data = resp.json()
        new_access_token = data.get("access_token")

        if not new_access_token:
            logger.error(f"[TokenRefresher] No access_token in response: {data}")
            return None

        # Persist the new token
        user.google_access_token = new_access_token
        db.commit()

        logger.info(f"[TokenRefresher] ✅ Successfully refreshed access token for {user.email}")
        return new_access_token

    except Exception as e:
        logger.error(f"[TokenRefresher] Exception during token refresh for {user.email}: {e}")
        return None


def get_valid_access_token(user: User, db: Session) -> str | None:
    """
    Returns a valid Google access token for the user.
    If the stored token has expired (detected by a live API call failure),
    it will auto-refresh using the refresh token.

    This is a convenience wrapper — call this instead of accessing
    user.google_access_token directly.
    """
    if not user.google_access_token:
        # No token at all — try to get one via refresh
        return refresh_google_access_token(user, db)

    # Do a lightweight token info check to see if it's still valid
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?access_token={user.google_access_token}",
            timeout=5,
        )
        if resp.status_code == 200:
            return user.google_access_token  # Still valid

        # Token is invalid/expired — refresh it
        logger.info(f"[TokenRefresher] Access token expired for {user.email} (HTTP {resp.status_code}), refreshing...")
        return refresh_google_access_token(user, db)

    except Exception as e:
        logger.warning(f"[TokenRefresher] Could not verify token validity: {e}. Using stored token anyway.")
        return user.google_access_token
