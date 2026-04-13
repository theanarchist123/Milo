from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

# Try to initialize Firebase Admin SDK. 
# You will need to download the service account JSON from Firebase Console 
# and place it at backend/firebase_service_account.json
try:
    cred = credentials.Certificate("backend/firebase_service_account.json")
    firebase_admin.initialize_app(cred)
    FIREBASE_ENABLED = True
except Exception as e:
    print(f"Warning: Firebase Admin SDK not initialized. Error: {e}")
    FIREBASE_ENABLED = False

security = HTTPBearer()

def get_current_user(res: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = res.credentials
    if not FIREBASE_ENABLED:
        # Dev fallback if you haven't put the service account JSON in the backend yet
        # Assumes a single local user for testing without full auth enforcement
        user = db.query(User).filter(User.id == "local_dev_user").first()
        if not user:
            user = User(id="local_dev_user", email="dev@miro.ai")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    try:
        # Verify the Firebase Token sent by the frontend apiClient
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get('uid')
        email = decoded_token.get('email')

        user = db.query(User).filter(User.id == uid).first()
        
        # If user logs in for the first time, save them to the SQLite DB
        if not user:
            user = User(id=uid, email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
