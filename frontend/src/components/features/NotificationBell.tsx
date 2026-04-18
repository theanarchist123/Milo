import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { toastEmitter } from '@/components/features/ToastNotification';
import { auth } from '@/lib/firebase';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  sourceUrl: string;
  isRead: boolean;
  createdAt: string;
}

// Resolve the backend base URL (without /api suffix) for SSE / polling
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '')
  : 'http://localhost:8000';

/** Polling interval in milliseconds when SSE is unavailable */
const POLL_INTERVAL_MS = 10_000;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, accessToken } = useAuthStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastUnreadCount = useRef<number>(0);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    let evtSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    /**
     * Handle an incoming notification payload (same shape from both SSE and poll).
     */
    const handlePayload = (data: { unreadCount: number; latest: any }) => {
      if (typeof data.unreadCount === 'number') {
        if (data.unreadCount > lastUnreadCount.current && data.latest) {
          toastEmitter.emit({
            title: data.latest.title,
            body: data.latest.body,
            type: data.latest.type,
            sourceUrl: data.latest.sourceUrl,
          });
        }
        lastUnreadCount.current = data.unreadCount;
        loadNotifications();
      }
    };

    /**
     * Start polling /api/notifications/poll every POLL_INTERVAL_MS.
     * Used as a fallback when SSE is unavailable (e.g. Vercel serverless).
     */
    const startPolling = async () => {
      if (cancelled) return;
      console.info('[NotificationBell] Falling back to polling');

      const poll = async () => {
        if (cancelled) return;
        try {
          await auth.authStateReady();
          const currentUser = auth.currentUser;
          if (!currentUser) return;
          const firebaseToken = await currentUser.getIdToken();
          const res = await fetch(
            `${BACKEND_BASE}/api/notifications/poll?token=${encodeURIComponent(firebaseToken)}`
          );
          if (res.ok) {
            const data = await res.json();
            handlePayload(data);
          }
        } catch (err) {
          console.warn('[NotificationBell] Poll error:', err);
        }
      };

      // Initial poll immediately
      await poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    };

    /**
     * Try SSE first; on failure, fall back to polling.
     */
    const setupRealtime = async () => {
      if (!user) return;
      try {
        await auth.authStateReady();
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const firebaseToken = await currentUser.getIdToken();

        evtSource = new EventSource(
          `${BACKEND_BASE}/api/notifications/stream?token=${encodeURIComponent(firebaseToken)}`
        );

        evtSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handlePayload(data);
          } catch (e) {
            // Ignore parse errors
          }
        };

        evtSource.onerror = () => {
          // SSE failed (Vercel serverless, network issue, etc.) → fall back to polling
          console.warn('[NotificationBell] SSE error — switching to polling');
          evtSource?.close();
          evtSource = null;
          startPolling();
        };
      } catch (err) {
        console.error('[NotificationBell] Failed to setup SSE:', err);
        startPolling();
      }
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (evtSource) {
        evtSource.close();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    setIsOpen(false);
    if (n.sourceUrl) {
      navigate(n.sourceUrl);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-text-tertiary hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-background"
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 max-h-[85vh] overflow-y-auto bg-surface border border-border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[999] flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-surface/95 backdrop-blur z-10">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-emerald hover:text-emerald-light transition-colors flex items-center gap-1"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="p-2 space-y-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-tertiary">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                      n.isRead ? 'hover:bg-white/[0.04]' : 'bg-emerald/5 hover:bg-emerald/10'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <strong className={`text-sm tracking-tight ${n.isRead ? 'text-text-primary' : 'text-emerald'}`}>
                          {n.title}
                        </strong>
                        <span className="text-[10px] text-text-tertiary whitespace-nowrap mt-0.5">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${n.isRead ? 'text-text-secondary' : 'text-text-primary/90'}`}>
                        {n.body}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
