import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  rightPanel?: React.ReactNode;
  className?: string;
}

export function PageWrapper({
  children,
  headerTitle,
  headerSubtitle,
  rightPanel,
  className,
}: PageWrapperProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={headerTitle} subtitle={headerSubtitle} />

        <div className="flex flex-1 min-h-0">
          {/* Main content area */}
          <main className={cn('flex-1 overflow-y-auto p-6', className)}>
            {children}
          </main>

          {/* Optional right panel */}
          {rightPanel && (
            <aside className="w-[300px] flex-shrink-0 border-l border-white/[0.06] overflow-y-auto p-4 bg-surface">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
