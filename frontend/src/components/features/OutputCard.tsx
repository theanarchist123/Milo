import { motion } from 'framer-motion';
import { FileText, Download, Eye, Clock } from 'lucide-react';
import { cn, timeAgo, formatFileSize, formatDate } from '@/lib/utils';
import type { Output, OutputType } from '@/types';

const TYPE_BADGE: Record<OutputType, string> = {
  ASSIGNMENT: 'badge-amber',
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
      className="card p-5 flex flex-col gap-4 cursor-default"
    >
      {/* Icon + type */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-amber-muted flex items-center justify-center">
          <FileText size={20} className="text-amber" />
        </div>
        <span className={cn('badge', TYPE_BADGE[output.type])}>
          {TYPE_LABEL[output.type]}
        </span>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
          {output.title}
        </h3>
        <p className="text-xs text-text-secondary mt-1 truncate">
          From: {output.sourceSubject}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <span>{formatDate(output.generatedAt)}</span>
        <span>·</span>
        <span>{formatFileSize(output.fileSizeBytes)}</span>
      </div>

      {/* Expiry */}
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Clock size={11} />
        <span>Expires {timeAgo(output.expiresAt)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-white/[0.06] mt-auto">
        <button
          onClick={() => onPreview(output)}
          className="btn btn-secondary flex-1 text-xs py-2"
        >
          <Eye size={13} /> Preview
        </button>
        <a
          href={output.docxUrl}
          className="btn btn-primary flex-1 text-xs py-2"
          download
        >
          <Download size={13} /> Download
        </a>
      </div>
    </motion.div>
  );
}
