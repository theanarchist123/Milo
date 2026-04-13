import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmailsPage } from './pages/EmailsPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { VaultPage } from './pages/VaultPage';
import { ProcessorPage } from './pages/ProcessorPage';
import { SettingsPage } from './pages/SettingsPage';

import { useAuthStore } from './stores/authStore';
import { useAuth } from './hooks/useAuth';

// Auth Guard Wrapper
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show spinner ONLY during the very first cold-load (no persisted user, waiting
  // for Firebase). If we have a persisted user (isAuthenticated=true), skip the
  // spinner — Firebase re-validates silently in the background.
  if (isLoading && !isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  // Initialize auth listener
  useAuth();
  
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      {/* AnimatePresence for page transitions */}
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/emails" element={<RequireAuth><EmailsPage /></RequireAuth>} />
          <Route path="/classroom" element={<RequireAuth><ClassroomPage /></RequireAuth>} />
          <Route path="/files" element={<RequireAuth><VaultPage /></RequireAuth>} />
          <Route path="/process/:taskId" element={<RequireAuth><ProcessorPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
