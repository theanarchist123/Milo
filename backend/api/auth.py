import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import User

# Load local overrides first (untracked), then fallback defaults from .env.
load_dotenv(dotenv_path=".env.local", override=False)
load_dotenv(override=False)

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")

# ─── Token Verification (google-auth, no service account required) ────────────
#
# We use google.oauth2.id_token.verify_firebase_token instead of firebase-admin.
# This fetches Google's public JWK endpoint (unauthenticated, fast, cached) to
# validate the JWT — no ADC, no GCP metadata server, no hanging.
#
try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_auth_requests
    _google_request = google_auth_requests.Request()   # reuse across requests (caches certs)
    FIREBASE_ENABLED = bool(FIREBASE_PROJECT_ID)
    if FIREBASE_ENABLED:
        print(f"[Auth] Firebase token verification ready (project: {FIREBASE_PROJECT_ID})")
    else:
        print("[Auth] FIREBASE_PROJECT_ID not set — running in dev mode (no auth enforcement).")
except ImportError:
    FIREBASE_ENABLED = False
    print("[Auth] google-auth not installed — running in dev mode.")


def _verify_firebase_token(token: str) -> dict:
    """
    Verify a Firebase ID token using Google's public JWK certs.
    Returns the decoded claims dict with at least 'uid', 'email', 'name', 'picture'.
    Raises ValueError on invalid/expired tokens.
    """
    decoded = google_id_token.verify_firebase_token(
        token,
        _google_request,
        audience=FIREBASE_PROJECT_ID,
        clock_skew_in_seconds=10,  # tolerate up to 10s clock drift between client and server
    )
    # Firebase puts the user's UID in the 'sub' claim (same as 'user_id')
    decoded.setdefault("uid", decoded.get("sub", ""))
    return decoded


# ─── Security scheme ─────────────────────────────────────────────────────────
security = HTTPBearer()


# ─── Core auth dependency ─────────────────────────────────────────────────────

def get_current_user(
    res: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Verifies the Firebase ID token from the Authorization header.
    Creates a new User DB record on first sign-in.
    Falls back to a local dev user if Firebase is not configured.
    """
    token = res.credentials

    if not FIREBASE_ENABLED:
        # Dev fallback — no token verification, single shared local user
        user = db.query(User).filter(User.id == "local_dev_user").first()
        if not user:
            user = User(id="local_dev_user", email="dev@miro.ai", display_name="Dev User")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    try:
        claims = _verify_firebase_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid   = claims["uid"]
    email = claims.get("email", "")

    try:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = User(
                id=uid,
                email=email,
                display_name=claims.get("name", ""),
                photo_url=claims.get("picture"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception as db_err:
        # DB errors are server-side problems, not auth problems
        from fastapi import HTTPException as HTTPEx
        raise HTTPEx(
            status_code=500,
            detail=f"Database error during user lookup: {str(db_err)}",
        )


# ─── Auth Router ──────────────────────────────────────────────────────────────
router = APIRouter()


class StoreTokenRequest(BaseModel):
    accessToken: str
    refreshToken: Optional[str] = None
    displayName: Optional[str] = None
    email: Optional[str] = None
    photoURL: Optional[str] = None


@router.post("/store-token")
def store_token(
    body: StoreTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Receives and stores the Google OAuth2 access token (for Gmail/Classroom APIs).
    Called by the frontend immediately after signInWithPopup succeeds.
    """
    current_user.google_access_token = body.accessToken
    if body.refreshToken:
        current_user.google_refresh_token = body.refreshToken
    if body.displayName:
        current_user.display_name = body.displayName
    if body.email:
        current_user.email = body.email
    if body.photoURL:
        current_user.photo_url = body.photoURL
    db.commit()
    return {"status": "token_stored", "uid": current_user.id}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the current authenticated user's profile."""
    return {
        "uid": current_user.id,
        "email": current_user.email,
        "displayName": current_user.display_name,
        "photoURL": current_user.photo_url,
        "hasGoogleToken": bool(current_user.google_access_token),
    }


@router.get("/connection-status")
def connection_status(current_user: User = Depends(get_current_user)):
    """
    Tests the stored Google OAuth access token against Gmail and Classroom APIs.
    Returns live connected/error status for each service.
    """
    has_token = bool(current_user.google_access_token)
    gmail_ok, classroom_ok = False, False
    gmail_error, classroom_error = None, None

    if has_token:
        try:
            from googleapiclient.discovery import build
            from google.oauth2.credentials import Credentials
            creds = Credentials(token=current_user.google_access_token)

            try:
                gmail_svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
                gmail_svc.users().getProfile(userId="me").execute()
                gmail_ok = True
            except Exception as e:
                gmail_error = str(e)[:200]

            try:
                cr_svc = build("classroom", "v1", credentials=creds, cache_discovery=False)
                cr_svc.courses().list(pageSize=1).execute()
                classroom_ok = True
            except Exception as e:
                classroom_error = str(e)[:200]

        except Exception as e:
            gmail_error = classroom_error = str(e)[:200]

    return {
        "hasToken": has_token,
        "gmail":     {"connected": gmail_ok,      "error": gmail_error},
        "classroom": {"connected": classroom_ok,  "error": classroom_error},
        "drive":     {"connected": gmail_ok,       "error": None},
    }
