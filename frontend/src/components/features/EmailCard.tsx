import { motion } from 'framer-motion';
import { Paperclip, CheckCircle2, Loader2, XCircle, ChevronRight } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Email, EmailType } from '@/types';

const TYPE_BADGE: Record<EmailType, string> = {
  ASSIGNMENT:   'badge-emerald',
  NOTES:        'badge-indigo',
  ANNOUNCEMENT: 'badge-teal',
  UNCLASSIFIED: 'badge-gray',
};

const TYPE_LABEL: Record<EmailType, string> = {
  ASSIGNMENT:   'Assignment',
  NOTES:        'Notes',
  ANNOUNCEMENT: 'Announcement',
  UNCLASSIFIED: 'Unknown',
};

interface EmailCardProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function EmailCard({ email, isSelected, onClick, index }: EmailCardProps) {
  const type = email.classification?.type;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-white/[0.04] transition-all hover:bg-surface/40',
        isSelected && 'bg-emerald-muted border-l-2 border-l-amber'
      )}
    >
      {/* Sender avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-muted border border-indigo/20 flex items-center justify-center text-xs font-semibold text-indigo flex-shrink-0 mt-0.5">
        {email.senderInitials}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary truncate">{email.sender}</p>
          <span className="text-[11px] text-text-tertiary flex-shrink-0">{timeAgo(email.date)}</span>
        </div>

        <p className="text-sm text-text-secondary truncate mt-0.5">{email.subject}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {type && (
            <span className={cn('badge text-[10px]', TYPE_BADGE[type])}>
              {TYPE_LABEL[type]}
            </span>
          )}
          {email.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <Paperclip size={10} />
              {email.attachments.length}
            </span>
          )}
          {email.status === 'done' && (
            <CheckCircle2 size={12} className="text-success ml-auto" />
          )}
          {email.status === 'extracting' || email.status === 'generating' || email.status === 'classified' ? (
            <Loader2 size={12} className="text-emerald spinner ml-auto" />
          ) : null}
          {email.status === 'error' && (
            <XCircle size={12} className="text-danger ml-auto" />
          )}
        </div>
      </div>

      {isSelected && <ChevronRight size={14} className="text-emerald flex-shrink-0 mt-1" />}
    </motion.div>
  );
}
