import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

const requiredFirebaseFields = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

const missingFirebaseFields = requiredFirebaseFields.filter((field) => !firebaseConfig[field]);
if (missingFirebaseFields.length > 0) {
  throw new Error(
    `[firebase] Missing environment variables for: ${missingFirebaseFields.join(", ")}. ` +
    "Set them in frontend/.env.local for local dev or Vercel project environment variables for production."
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with ALL scopes required by backend services
export const googleProvider = new GoogleAuthProvider();
// Gmail
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
// Classroom — need all three; announcements needs its own scope
googleProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.students.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
// Drive — for downloading attachments
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
// Force account selection so the OAuth scopes are always re-granted on sign-in
googleProvider.setCustomParameters({ prompt: 'consent select_account' });
