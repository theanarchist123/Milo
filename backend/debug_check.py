"""Debug: test Gmail and Classroom API calls with the FIXED credential setup."""
import datetime
from database import SessionLocal
from models import User

db = SessionLocal()
users = db.query(User).all()

if not users:
    print("NO USERS IN DB")
    exit(1)

# Use the most recent user
user = users[-1]
print(f"Testing with user: {user.email}")
print(f"Token present: {'YES' if user.google_access_token else 'NO'}")
print()

if not user.google_access_token:
    print("NO TOKEN - cannot test. Sign in again.")
    exit(1)

token = user.google_access_token

# --- Gmail ---
print("=" * 60)
print("GMAIL TEST")
print("=" * 60)
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=token,
        expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
    )
    svc = build("gmail", "v1", credentials=creds, cache_discovery=False)
    
    profile = svc.users().getProfile(userId="me").execute()
    print(f"  OK - Profile: {profile.get('emailAddress')}")
    print(f"  Total messages: {profile.get('messagesTotal')}")
    
    results = svc.users().messages().list(userId="me", q="newer_than:30d", maxResults=5).execute()
    msgs = results.get("messages", [])
    print(f"  Messages found (last 30d, first 5): {len(msgs)}")
    
    for m in msgs[:3]:
        msg = svc.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["Subject", "From"]).execute()
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        print(f"    - {headers.get('Subject', '(no subject)')[:60]}")
        
except Exception as e:
    print(f"  FAILED: {e}")

print()

# --- Classroom ---
print("=" * 60)
print("CLASSROOM TEST")
print("=" * 60)
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=token,
        expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
    )
    svc = build("classroom", "v1", credentials=creds, cache_discovery=False)
    
    response = svc.courses().list(courseStates=["ACTIVE"]).execute()
    courses = response.get("courses", [])
    print(f"  Active courses: {len(courses)}")
    
    if not courses:
        # Try all states
        response2 = svc.courses().list().execute()
        all_courses = response2.get("courses", [])
        print(f"  All courses (any state): {len(all_courses)}")
        for c in all_courses[:5]:
            print(f"    - {c.get('name')} (state: {c.get('courseState')})")
    else:
        for c in courses[:5]:
            print(f"    - {c.get('name')} (id: {c.get('id')}, state: {c.get('courseState')})")
            # Try coursework
            try:
                cw = svc.courses().courseWork().list(courseId=c["id"], pageSize=3).execute()
                items = cw.get("courseWork", [])
                print(f"      Coursework: {len(items)} items")
                for item in items[:2]:
                    print(f"        - {item.get('title')}")
            except Exception as e2:
                print(f"      Coursework error: {e2}")
            # Try announcements
            try:
                ann = svc.courses().announcements().list(courseId=c["id"], pageSize=3).execute()
                items = ann.get("announcements", [])
                print(f"      Announcements: {len(items)} items")
                for item in items[:2]:
                    print(f"        - {item.get('text', '')[:60]}")
            except Exception as e2:
                print(f"      Announcements error: {e2}")
                
except Exception as e:
    print(f"  FAILED: {e}")

db.close()
print("\nDone.")
