import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Mail, GraduationCap, FileText,
  Settings, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/emails',     label: 'Emails',      icon: Mail },
  { to: '/classroom',  label: 'Classroom',   icon: GraduationCap },
  { to: '/files',      label: 'The Vault',   icon: FileText },
  { to: '/settings',   label: 'Settings',    icon: Settings },
];

type SyncState = 'idle' | 'syncing' | 'done' | 'error' | 'no-token';
type SyncResult = { label: string; isError: boolean };

export function Sidebar() {
  const { user, accessToken } = useAuthStore();
  const { sidebarOpen, toggleSidebar, requestRefetch } = useUiStore();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const isConnected = !!user;

  const handleSync = async () => {
    if (syncState === 'syncing') return;

    if (!accessToken) {
      setSyncState('no-token');
      setSyncResult({ label: 'Sign out → sign in again to sync', isError: true });
      setTimeout(() => { setSyncState('idle'); setSyncResult(null); }, 5000);
      return;
    }

    setSyncState('syncing');
    setSyncResult(null);

    try {
      // Sync is now synchronous on the backend — use a 90s timeout since
      // fetching 100 emails + multiple courses can take 20-40 seconds.
      const res = await apiClient.post('/sync/all', {}, { timeout: 90_000 });
      const data = res.data;

      // Check for errors
      if (data.status === 'error' || data.error === 'no_token') {
        const msg = data.gmail?.message || data.classroom?.message || data.message || 'Sync failed';
        const isTokenExpiry = msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('sign out');
        setSyncState('error');
        setSyncResult({
          label: isTokenExpiry ? 'Token expired — sign out & back in' : msg.slice(0, 60),
          isError: true,
        });
      } else {
        // Build a friendly result summary
        const emailsSaved = data.gmail?.saved ?? 0;
        const coursesFetched = data.classroom?.courses ?? 0;
        const itemsFetched = data.classroom?.items ?? 0;
        const gmailErr = data.gmail?.error;
        const classErr = data.classroom?.error;

        let label = '';
        if (!gmailErr && !classErr) {
          label = `Synced ${emailsSaved} email${emailsSaved !== 1 ? 's' : ''}, ${coursesFetched} course${coursesFetched !== 1 ? 's' : ''}, ${itemsFetched} item${itemsFetched !== 1 ? 's' : ''}`;
        } else {
          label = `Partial: ${emailsSaved} emails (${gmailErr ? '❌ Gmail' : '✓'}, ${classErr ? '❌ Classroom' : '✓'})`;
        }

        setSyncState('done');
        setSyncResult({ label, isError: false });
        requestRefetch(); // Tell useApi to reload all data from DB
      }
    } catch (err: unknown) {
      const axiosErr = err as { message?: string };
      const isTimeout = axiosErr?.message?.includes('timeout');
      setSyncState('error');
      setSyncResult({
        label: isTimeout ? 'Sync timed out — try again' : 'Network error — is the backend running?',
        isError: true,
      });
    } finally {
      setTimeout(() => { setSyncState('idle'); setSyncResult(null); }, 8000);
    }
  };


  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 250 : 64 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-surface border-r border-border flex-shrink-0 overflow-hidden"
      style={{ minWidth: sidebarOpen ? 250 : 64 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Milo Logo" className="w-full h-full object-contain" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-lg tracking-tight text-text-primary"
            >
              Milo<span className="text-emerald">.</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-border">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center text-xs font-semibold text-white">
              {user?.displayName?.charAt(0) ?? 'U'}
            </div>
          )}
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 flex-1"
            >
              <p className="text-sm font-medium text-text-primary truncate">{user?.displayName ?? 'Student'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-yellow-400'}`} />
                <span className="text-xs text-text-secondary truncate">
                  {isConnected ? (accessToken ? 'Google connected' : 'Sign in to sync') : 'Not signed in'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-emerald-muted text-emerald'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated',
                !sidebarOpen && 'justify-center px-2'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={cn('flex-shrink-0', isActive && 'text-emerald')} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sync button */}
      <div className="px-3 pb-5 pt-2 border-t border-border space-y-2">
        <button
          onClick={handleSync}
          disabled={syncState === 'syncing'}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            syncState === 'idle'     && 'bg-elevated text-text-secondary hover:text-text-primary hover:bg-border',
            syncState === 'syncing'  && 'bg-emerald-muted text-emerald shadow-card cursor-wait',
            syncState === 'done'     && 'bg-success/10 text-success',
            syncState === 'error'    && 'bg-danger/10 text-danger',
            syncState === 'no-token' && 'bg-yellow-500/10 text-yellow-400',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          {syncState === 'done' ? (
            <CheckCircle2 size={16} className="flex-shrink-0 text-success" />
          ) : syncState === 'no-token' || syncState === 'error' ? (
            <AlertTriangle size={16} className="flex-shrink-0" />
          ) : (
            <RefreshCw size={16} className={cn('flex-shrink-0', syncState === 'syncing' && 'spinner')} />
          )}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                key={syncState + (syncResult?.label ?? '')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="truncate text-left"
              >
                {syncResult?.label ||
                  ({
                    idle:       'Sync Now',
                    syncing:    'Fetching data…',
                    done:       'Sync complete ✓',
                    error:      'Sync failed — retry?',
                    'no-token': 'Sign in again to sync',
                  }[syncState])}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Progress bar shown while syncing — matches the 90s API timeout */}
        {syncState === 'syncing' && sidebarOpen && (
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full bg-emerald rounded-full"
              initial={{ width: '2%' }}
              animate={{ width: '92%' }}
              transition={{ duration: 85, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-border transition-colors z-10 box-shadow-card text-text-secondary"
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </motion.aside>
  );
}
