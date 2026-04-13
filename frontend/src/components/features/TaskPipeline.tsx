import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface PipelineStep {
  step: number;
  label: string;
  description: string;
  status: StepStatus;
}

interface TaskPipelineProps {
  steps: PipelineStep[];
  onRetry?: () => void;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  pending: <Circle size={18} className="text-text-tertiary" />,
  active:  <Loader2 size={18} className="text-amber spinner" />,
  done:    <CheckCircle2 size={18} className="text-success" />,
  error:   <XCircle size={18} className="text-danger" />,
};

const CARD_CLASS: Record<StepStatus, string> = {
  pending: 'border-white/[0.06] bg-surface',
  active:  'border-amber bg-amber-muted shadow-[0_0_20px_rgba(245,200,66,0.12)]',
  done:    'border-success/30 bg-surface',
  error:   'border-danger/40 bg-red-500/5',
};

export function TaskPipeline({ steps, onRetry }: TaskPipelineProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => (
        <div key={step.step} className="flex gap-4">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={false}
              animate={{
                scale: step.status === 'active' ? [1, 1.1, 1] : 1,
              }}
              transition={{ repeat: step.status === 'active' ? Infinity : 0, duration: 1.5 }}
              className="flex-shrink-0 mt-4"
            >
              {STATUS_ICON[step.status]}
            </motion.div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-px flex-1 my-1',
                  step.status === 'done' ? 'bg-success/30' : 'bg-white/[0.06]'
                )}
              />
            )}
          </div>

          {/* Step card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={cn(
              'flex-1 border rounded-xl p-4 mb-2 transition-all',
              CARD_CLASS[step.status]
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(
                  'text-sm font-semibold',
                  step.status === 'active' ? 'text-amber' :
                  step.status === 'done'   ? 'text-success' :
                  step.status === 'error'  ? 'text-danger' :
                  'text-text-secondary'
                )}>
                  Step {step.step}: {step.label}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">{step.description}</p>
              </div>

              {step.status === 'active' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber dot-pulse" />
                  <span className="text-xs text-amber font-medium">Processing</span>
                </div>
              )}
              {step.status === 'done' && (
                <span className="text-xs text-success font-medium">Done</span>
              )}
              {step.status === 'error' && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 text-xs text-danger hover:text-red-400 transition-colors"
                >
                  <RotateCcw size={12} /> Retry
                </button>
              )}
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
