import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import type { ActivityItem, EmailType, ActivityStatus } from '@/types';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_BADGE: Record<EmailType, string> = {
  ASSIGNMENT:    'badge-amber',
  NOTES:         'badge-indigo',
  ANNOUNCEMENT:  'badge-teal',
  UNCLASSIFIED:  'badge-gray',
};

const STATUS_ICON: Record<ActivityStatus, React.ReactNode> = {
  processing: <Loader2 size={14} className="text-amber spinner" />,
  done:       <CheckCircle2 size={14} className="text-success" />,
  error:      <XCircle size={14} className="text-danger" />,
};

const STATUS_DOT: Record<ActivityStatus, string> = {
  processing: 'bg-amber dot-pulse',
  done:       'bg-success',
  error:      'bg-danger',
};

export function ActivityRow({ item }: { item: ActivityItem }) {
  const navigate = useNavigate();

  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-elevated/50 transition-all cursor-default group"
    >
      {/* Status dot */}
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[item.status])} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate font-medium">{item.subject}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('badge text-[10px]', TYPE_BADGE[item.classification])}>
            {item.classification}
          </span>
          <span className="text-xs text-text-tertiary">{timeAgo(item.timestamp)}</span>
        </div>
      </div>

      {/* Right: status icon + action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {STATUS_ICON[item.status]}
        {item.taskId && item.status === 'done' && (
          <button
            onClick={() => navigate(`/process/${item.taskId}`)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-amber hover:underline"
          >
            View <ArrowRight size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
