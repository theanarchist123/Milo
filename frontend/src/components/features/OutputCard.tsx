import { motion } from 'framer-motion';
import { FileText, Download, Eye, Clock } from 'lucide-react';
import { cn, timeAgo, formatFileSize, formatDate } from '@/lib/utils';
import type { Output, OutputType } from '@/types';

const TYPE_BADGE: Record<OutputType, string> = {
  ASSIGNMENT: 'badge-emerald',
  SUMMARY:    'badge-indigo',
  QA:         'badge-teal',
  EXPERIMENT: 'badge-red',
};

const TYPE_LABEL: Record<OutputType, string> = {
  ASSIGNMENT: 'Assignment',
  SUMMARY:    'Summary',
  QA:         'Q&A',
  EXPERIMENT: 'Experiment',
};

interface OutputCardProps {
  output: Output;
  onPreview: (output: Output) => void;
  index: number;
}

export function OutputCard({ output, onPreview, index }: OutputCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ scale: 1.015, borderColor: 'rgba(255,255,255,0.1)' }}
      className="card p-5 flex flex-col justify-between h-full min-w-0 overflow-hidden"
    >
      <div className="flex flex-col gap-4">
        {/* Icon + type */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-emerald-muted flex items-center justify-center shrink-0">
            <FileText size={20} className="text-emerald" />
          </div>
          <span className={cn('badge shrink-0 text-[10px]', TYPE_BADGE[output.type])}>
            {TYPE_LABEL[output.type]}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1 min-h-0 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug break-words">
            {output.title}
          </h3>
          <p className="text-xs text-text-secondary mt-1 truncate">
            From: {output.sourceSubject}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="shrink-0">{formatDate(output.generatedAt)}</span>
          <span className="shrink-0">·</span>
          <span className="truncate">{formatFileSize(output.fileSizeBytes)}</span>
        </div>

        {/* Expiry */}
        {output.expiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <Clock size={11} className="shrink-0" />
            <span className="truncate">Expires {timeAgo(output.expiresAt)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-border mt-4 shrink-0">
        <button
          onClick={() => onPreview(output)}
          className="btn btn-secondary flex-1 text-xs py-2 px-1 lg:px-2 gap-1"
        >
          <Eye size={13} className="shrink-0" /> Preview
        </button>
        <a
          href={output.docxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary flex-1 text-xs py-2 px-1 lg:px-2 text-center items-center justify-center inline-flex gap-1"
        >
          <Download size={13} className="shrink-0" /> Download
        </a>
      </div>
    </motion.div>
  );
}
