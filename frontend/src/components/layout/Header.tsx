import { Bell, Search, Command } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();
  const { setCommandPaletteOpen } = useUiStore();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Student';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] bg-surface/80 backdrop-blur-sm flex-shrink-0">
      {/* Left: greeting */}
      <div>
        {title ? (
          <>
            <h1 className="text-base font-semibold text-text-primary leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary">
              {getGreeting()}, <span className="text-amber">{firstName}</span>
            </p>
            <p className="text-xs text-text-secondary">
              {user ? 'Click Sync Now in the sidebar to fetch your latest emails & coursework' : 'Loading…'}
            </p>
          </>
        )}
      </div>

      {/* Right: search + bell */}
      <div className="flex items-center gap-3">
        {/* CMD+K Search */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated border border-white/[0.06] text-text-secondary hover:border-white/10 hover:text-text-primary transition-all text-sm"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search everything…</span>
          <kbd className="hidden sm:flex items-center gap-0.5 ml-2 text-[10px] text-text-tertiary">
            <Command size={10} />K
          </kbd>
        </button>

        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-lg bg-elevated border border-white/[0.06] flex items-center justify-center hover:border-white/10 transition-all text-text-secondary hover:text-text-primary">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber border-2 border-surface" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/10">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo flex items-center justify-center text-sm font-semibold text-white">
              {user?.displayName?.charAt(0) ?? 'U'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
