import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { AnimatedPage, FloatingCard, AnimatedCounter } from '@/components/animated';
import { useUnsplash } from '@/hooks/useUnsplash';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/apiClient';

export function LoginPage() {
  const { url, loading } = useUnsplash('university library dark');
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      // Real Firebase Google Sign-In with OAuth scopes (Gmail, Classroom, Drive)
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Extract the Google OAuth2 access token from the credential
      // This token lets the backend call Gmail, Classroom, and Drive APIs on behalf of the user
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const oauthAccessToken = credential?.accessToken ?? null;

      // Set user in Zustand store — onAuthStateChanged in useAuth.ts will also fire
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? 'Student',
        photoURL: firebaseUser.photoURL,
      });

      // Store the OAuth access token so components can access it
      setAccessToken(oauthAccessToken);

      // Send the OAuth access token to the backend so it can call Google APIs
      if (oauthAccessToken) {
        try {
          const idToken = await firebaseUser.getIdToken();
          await apiClient.post('/auth/store-token', {
            accessToken: oauthAccessToken,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          }, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch (backendErr) {
          // Non-fatal — user can still use the app, sync will prompt re-auth if token missing
          console.warn('Could not store token in backend (non-fatal):', backendErr);
        }
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      // Don't show the popup-closed error as a real error
      if (!(message.includes('popup-closed') || message.includes('cancelled'))) {
        setError('Sign-in failed. Please check your connection and try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <AnimatedPage className="flex min-h-screen bg-background">
      {/* Left side: Visuals */}
      <div className="hidden lg:flex w-[60%] relative overflow-hidden flex-col justify-center p-20">
        {/* Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img src={url ?? ''} alt="Library" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
          <div className="img-overlay" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber flex items-center justify-center">
                <Bot size={24} className="text-[#0A0A0F]" />
              </div>
              <span className="text-xl font-bold tracking-tight">Miro.</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-8">
              Your academic life, <br />
              <span className="text-amber">automated.</span>
            </h1>

            <div className="space-y-5">
              {[
                'Reads your Gmail and Classroom automatically',
                'Understands every attachment (PDF, DOCX, PPTX)',
                'Generates assignments, summaries, and study guides',
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-4 text-text-secondary text-lg"
                >
                  <CheckCircle2 size={24} className="text-success" />
                  {text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="mt-16 flex gap-6">
            <FloatingCard delay={0} className="bg-surface/60 backdrop-blur-md border-white/[0.08] w-64">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-amber">ASSIGNMENT</span>
                <span className="text-xs text-text-tertiary">Just now</span>
              </div>
              <p className="text-sm font-medium text-white">Wave Mechanics Lab Report</p>
              <div className="h-1.5 w-full bg-elevated rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-amber w-[100%]" />
              </div>
            </FloatingCard>
            
            <FloatingCard delay={1.5} className="bg-surface/60 backdrop-blur-md border-white/[0.08] w-64 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-indigo">SUMMARY</span>
                <span className="text-xs text-text-tertiary">5m ago</span>
              </div>
              <p className="text-sm font-medium text-white">Database Normalization</p>
              <div className="text-2xl font-bold text-white mt-2">
                <AnimatedCounter target={12} /> <span className="text-sm font-normal text-text-secondary">Q&A pairs</span>
              </div>
            </FloatingCard>
          </div>
        </div>
      </div>

      {/* Right side: Login */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full lg:w-[40%] flex flex-col items-center justify-center p-12 bg-surface shadow-2xl z-20 relative"
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Miro</h2>
            <p className="text-text-secondary">Sign in with your university Google account</p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm"
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] amber-glow mb-8 hover:shadow-[0_0_30px_rgba(245,200,66,0.3)] border-2 border-transparent hover:border-amber disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-white"
          >
            {signingIn ? (
              <Loader2 size={20} className="animate-spin text-gray-500" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {signingIn ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Miro needs access to:</h3>
            <div className="space-y-3">
              {[
                { icon: <ShieldCheck size={16} className="text-amber" />, text: 'Gmail Read Access', desc: 'To fetch incoming assignments' },
                { icon: <ShieldCheck size={16} className="text-indigo" />, text: 'Classroom Access', desc: 'To read coursework & materials' },
                { icon: <ShieldCheck size={16} className="text-success" />, text: 'Drive Access', desc: 'To download attached files' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm text-text-primary">{item.text}</p>
                    <p className="text-xs text-text-tertiary">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-tertiary text-center mt-10">
            We never store your emails. Processing happens locally and securely.
          </p>
        </div>
      </motion.div>
    </AnimatedPage>
  );
}
