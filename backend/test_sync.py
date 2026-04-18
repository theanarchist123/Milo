from database import SessionLocal
from models import User
from services.classroom_service import fetch_classroom_for_user
from services.gmail_service import fetch_emails_for_user
import logging

logging.basicConfig(level=logging.DEBUG)

def main():
    db = SessionLocal()
    user = db.query(User).filter(User.google_access_token != None).first()

    if not user:
        print("No user with google token found.")
        return

    print("=== Testing Sync ===")
    print(f"User: {user.email}")
    
    print("\n--- Classroom Sync ---")
    try:
        class_res = fetch_classroom_for_user(user.id, user.google_access_token)
        print("Classroom Res:", class_res)
    except Exception as e:
        print("Classroom Exception:", e)

    print("\n--- Gmail Sync ---")
    try:
        gmail_res = fetch_emails_for_user(user.id, user.google_access_token)
        print("Gmail Res:", gmail_res)
    except Exception as e:
        print("Gmail Exception:", e)

if __name__ == "__main__":
    main()
