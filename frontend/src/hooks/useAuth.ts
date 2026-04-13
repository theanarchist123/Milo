import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force-refresh the ID token so we're sure we have a valid, non-expired
        // token before any API calls are made. This is especially important when
        // the session is restored from cache after a page reload.
        try {
          await firebaseUser.getIdToken(/* forceRefresh */ true);
        } catch (e) {
          console.warn('[useAuth] Could not refresh ID token:', e);
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? 'Student',
          photoURL: firebaseUser.photoURL,
        });
      } else {
        logout();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, logout]);

  return { user, isLoading, isAuthenticated };
}
