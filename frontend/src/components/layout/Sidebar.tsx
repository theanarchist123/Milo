import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Mail, GraduationCap, FileText,
  Settings, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/emails',     label: 'Emails',      icon: Mail,            badge: 3 },
  { to: '/classroom',  label: 'Classroom',   icon: GraduationCap },
  { to: '/files',      label: 'The Vault',   icon: FileText },
  { to: '/settings',   label: 'Settings',    icon: Settings },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2500);
  };

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-surface border-r border-white/[0.06] flex-shrink-0 overflow-hidden"
      style={{ minWidth: sidebarOpen ? 240 : 64 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center flex-shrink-0">
          <span className="text-[#0A0A0F] font-bold text-sm">M</span>
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
              Miro
              <span className="text-amber">.</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-full bg-indigo flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white">
          {user?.displayName?.charAt(0) ?? 'U'}
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
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs text-text-secondary">Connected</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-amber-muted text-amber'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated',
                !sidebarOpen && 'justify-center px-2'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={cn('flex-shrink-0', isActive && 'text-amber')}
                />
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
                {badge && sidebarOpen && (
                  <span className="text-xs bg-amber text-[#0A0A0F] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sync button */}
      <div className="px-3 pb-5 pt-2 border-t border-white/[0.06]">
        <button
          onClick={handleSync}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
            syncing
              ? 'bg-amber-muted text-amber amber-glow'
              : 'bg-elevated text-text-secondary hover:text-text-primary hover:bg-white/[0.06]',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          <RefreshCw size={16} className={cn('flex-shrink-0', syncing && 'spinner')} />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {syncing ? 'Syncing…' : 'Sync Now'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-elevated border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors z-10"
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </motion.aside>
  );
}
