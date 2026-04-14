import React from 'react';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import type { ActivityItem, EmailType, ActivityStatus } from '@/types';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_BADGE: Record<string, string> = {
  ASSIGNMENT:   'badge-emerald',
  NOTES:        'badge-indigo',
  ANNOUNCEMENT: 'badge-teal',
  UNCLASSIFIED: 'badge-gray',
  UNKNOWN:      'badge-gray',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  processing: <Loader2 size={14} className="text-emerald spinner" />,
  done:       <CheckCircle2 size={14} className="text-success" />,
  error:      <XCircle size={14} className="text-danger" />,
  // Backend statuses that map to visual states:
  fetched:    <Loader2 size={14} className="text-emerald spinner" />,
  classified: <Loader2 size={14} className="text-emerald spinner" />,
  extracting: <Loader2 size={14} className="text-emerald spinner" />,
  generating: <Loader2 size={14} className="text-emerald spinner" />,
};

const STATUS_DOT: Record<string, string> = {
  processing: 'bg-emerald dot-pulse',
  done:       'bg-success',
  error:      'bg-danger',
  fetched:    'bg-emerald dot-pulse',
  classified: 'bg-emerald dot-pulse',
  extracting: 'bg-emerald dot-pulse',
  generating: 'bg-emerald dot-pulse',
};

export function ActivityRow({ item }: { item: ActivityItem }) {
  const navigate = useNavigate();
  const statusKey = item.status ?? 'fetched';
  const isDone = statusKey === 'done';

  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface/50 transition-all cursor-default group"
    >
      {/* Status dot */}
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[statusKey] ?? 'bg-text-tertiary')} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate font-medium">{item.subject}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('badge text-[10px]', TYPE_BADGE[item.classification] ?? 'badge-gray')}>
            {item.classification}
          </span>
          <span className="text-xs text-text-tertiary">{timeAgo(item.timestamp)}</span>
        </div>
      </div>

      {/* Right: status icon + action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {STATUS_ICON[statusKey] ?? null}
        {item.taskId && isDone && (
          <button
            onClick={() => navigate(`/process/${item.taskId}`)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-emerald hover:underline"
          >
            View <ArrowRight size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
