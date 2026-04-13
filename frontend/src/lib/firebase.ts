import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// As provided by user
const firebaseConfig = {
  apiKey: "AIzaSyCevMRWE1oSU-5XiAj061i3O02I_uj_0Gw",
  authDomain: "miro-ai-693db.firebaseapp.com",
  projectId: "miro-ai-693db",
  storageBucket: "miro-ai-693db.firebasestorage.app",
  messagingSenderId: "800431554426",
  appId: "1:800431554426:web:0bc1947339b9bea4baa0c3",
  measurementId: "G-K6FTB9H3WY"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with ALL scopes required by backend services
export const googleProvider = new GoogleAuthProvider();
// Gmail
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
// Classroom — need all three; announcements needs its own scope
googleProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.students.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
// Drive — for downloading attachments
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
// Force account selection so the OAuth scopes are always re-granted on sign-in
googleProvider.setCustomParameters({ prompt: 'consent select_account' });
