import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmailsPage } from './pages/EmailsPage';
import { ClassroomPage } from './pages/ClassroomPage';
import { VaultPage } from './pages/VaultPage';
import { ProcessorPage } from './pages/ProcessorPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastContainer } from './components/features/ToastNotification';

import { useAuthStore } from './stores/authStore';
import { useAuth } from './hooks/useAuth';

// Auth Guard Wrapper
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading && !isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald border-t-transparent animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  // Initialize auth listener
  useAuth();
  
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      {/* Global Toasts */}
      <ToastContainer />
      
      {/* AnimatePresence for page transitions */}
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          
          {/* Authenticated Routes */}
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
