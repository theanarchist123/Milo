import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, ShieldCheck, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { AnimatedPage, FloatingCard, AnimatedCounter } from '@/components/animated';
import { useUnsplash } from '@/hooks/useUnsplash';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/apiClient';

export function LoginPage() {
  const { url, loading } = useUnsplash('abstract architecture white clean');
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const oauthAccessToken = credential?.accessToken ?? null;

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? 'Student',
        photoURL: firebaseUser.photoURL,
      });

      setAccessToken(oauthAccessToken);

      if (oauthAccessToken) {
        try {
          const idToken = await firebaseUser.getIdToken();
          // Extract the OAuth refresh token from Firebase's internal token response.
          // This allows the backend to silently refresh the access token after it
          // expires (every ~1 hour) without forcing the user to sign in again.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const refreshToken = (result as any)._tokenResponse?.refreshToken ?? null;
          await apiClient.post('/auth/store-token', {
            accessToken: oauthAccessToken,
            refreshToken,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          }, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch (backendErr) {
          console.warn('Could not store token in backend (non-fatal):', backendErr);
        }
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
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
      <div className="hidden lg:flex w-[55%] relative overflow-hidden flex-col justify-center p-20 border-r border-border bg-surface">
        {/* Background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 0.4 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img src={url ?? ''} alt="Architecture" className="w-full h-full object-cover grayscale opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface to-transparent" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Milo Logo" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold tracking-tight text-white">Milo AI.</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-8 tracking-tight">
              Your academic life, <br />
              <span className="text-emerald">automated.</span>
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
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-4 text-text-secondary text-lg"
                >
                  <CheckCircle2 size={24} className="text-emerald shrink-0" />
                  {text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="mt-16 flex gap-6">
            <FloatingCard delay={0} className="bg-surface shadow-card border-border w-64">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-emerald">ASSIGNMENT</span>
                <span className="text-xs text-text-tertiary">Just now</span>
              </div>
              <p className="text-sm font-bold text-white">Wave Mechanics Lab Report</p>
              <div className="h-1.5 w-full bg-border rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-emerald w-[100%]" />
              </div>
            </FloatingCard>
            
            <FloatingCard delay={1.5} className="bg-surface shadow-card border-border w-64 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-indigo">SUMMARY</span>
                <span className="text-xs text-text-tertiary">5m ago</span>
              </div>
              <p className="text-sm font-bold text-white">Database Normalization</p>
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
        className="w-full lg:w-[45%] flex flex-col justify-center p-12 bg-background relative"
      >
        <button onClick={() => navigate('/')} className="absolute top-8 left-8 text-text-tertiary hover:text-text-primary flex items-center gap-2 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Milo</h2>
            <p className="text-text-secondary">Sign in with your university Google account</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] shadow-card hover:-translate-y-1 mb-8 border border-border hover:border-emerald disabled:opacity-60 disabled:cursor-not-allowed"
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Milo needs access to:</h3>
            <div className="space-y-3">
              {[
                { icon: <ShieldCheck size={16} className="text-emerald" />, text: 'Gmail Read Access', desc: 'To fetch incoming assignments' },
                { icon: <ShieldCheck size={16} className="text-indigo" />, text: 'Classroom Access', desc: 'To read coursework & materials' },
                { icon: <ShieldCheck size={16} className="text-emerald" />, text: 'Drive Access', desc: 'To download attached files' },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.text}</p>
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
