import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, ChevronDown, Bot, Sparkles } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { TaskPipeline } from '@/components/features/TaskPipeline';
import { AnimatedPage } from '@/components/animated';
import { apiClient } from '@/lib/apiClient';

type StepStatus = 'pending' | 'active' | 'done' | 'error';

const PIPELINE_DEFINITIONS = [
  { step: 1, label: 'Classify',    description: 'Gemini AI analyzing content type & priority' },
  { step: 2, label: 'Generate',    description: 'Creating assignment / summary / Q&A with AI' },
  { step: 3, label: 'Save',        description: 'Writing output to database' },
  { step: 4, label: 'Complete',    description: 'Done — view your result in The Vault' },
];

const STATUS_TO_ACTIVE_STEP: Record<string, number> = {
  QUEUED:      1,
  CLASSIFYING: 1,
  GENERATING:  2,
  WRITING:     3,
  DONE:        5, // Past all steps
  ERROR:       -1,
};

function buildPipelineSteps(taskStatus: string) {
  if (!taskStatus) {
    return PIPELINE_DEFINITIONS.map(d => ({ ...d, status: 'pending' as StepStatus }));
  }

  const activeStep = STATUS_TO_ACTIVE_STEP[taskStatus] ?? 1;
  const isError = taskStatus === 'ERROR';
  const isDone = taskStatus === 'DONE';

  return PIPELINE_DEFINITIONS.map(d => {
    let status: StepStatus = 'pending';
    if (isDone) {
      status = 'done';
    } else if (isError && d.step <= activeStep) {
      status = d.step === activeStep ? 'error' : 'done';
    } else if (d.step < activeStep) {
      status = 'done';
    } else if (d.step === activeStep) {
      status = 'active';
    }
    return { ...d, status };
  });
}

interface TaskDetail {
  id: string;
  status: string;
  sourceSubject: string;
  sourceType: string;
  currentStep: string;
  errorMessage?: string;
  startedAt: string;
}

export function ProcessorPage() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [extractedOpen, setExtractedOpen] = useState(false);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchTask = async () => {
    if (!taskId || taskId === 'new') return;
    try {
      const res = await apiClient.get(`/tasks/${taskId}`);
      setTask(res.data);
      if (res.data.status === 'DONE' || res.data.status === 'ERROR') {
        if (pollInterval) clearInterval(pollInterval);
        setPollInterval(null);
      }
    } catch (err) {
      console.warn('[ProcessorPage] Could not fetch task:', err);
    }
  };

  useEffect(() => {
    fetchTask();
    const interval = setInterval(fetchTask, 2000);
    setPollInterval(interval);
    return () => clearInterval(interval);
  }, [taskId]);

  const steps = buildPipelineSteps(task?.status ?? '');
  const isNewRoute = !taskId || taskId === 'new';

  return (
    <AnimatedPage>
      <PageWrapper>
        <div className="max-w-3xl mx-auto pb-12">

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Title Area */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-muted mb-4"
            >
              {task ? <Sparkles size={32} className="text-amber" /> : <Bot size={32} className="text-amber" />}
            </motion.div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {task ? 'AI Processing Pipeline' : isNewRoute ? 'Ready to Process' : 'Loading task…'}
            </h1>
            <p className="text-text-secondary max-w-md mx-auto">
              {task?.sourceSubject ??
                (isNewRoute
                  ? 'Select an email or classroom item and click "Process with Miro" to start the AI pipeline.'
                  : 'Fetching task details…')}
            </p>
            {task?.status && (
              <span className={`inline-block mt-3 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                task.status === 'DONE'  ? 'bg-success/10 text-success' :
                task.status === 'ERROR' ? 'bg-danger/10 text-danger' :
                'bg-amber/10 text-amber'
              }`}>
                {task.status}
              </span>
            )}

            {/* Live step indicator */}
            {task && !['DONE', 'ERROR'].includes(task.status) && (
              <motion.p
                key={task.currentStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-amber mt-3"
              >
                {task.currentStep}
              </motion.p>
            )}
          </div>

          {/* Pipeline Card */}
          {!isNewRoute ? (
            <div className="card p-6 md:p-8 relative overflow-hidden bg-surface shadow-2xl mb-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber to-transparent opacity-50" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={task?.status ?? 'loading'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TaskPipeline steps={steps} />
                </motion.div>
              </AnimatePresence>

              {/* Done message */}
              {task?.status === 'DONE' && (
                <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
                  <p className="text-success font-semibold mb-3">✓ Processing complete — your document is ready!</p>
                  <button onClick={() => navigate('/files')} className="btn btn-primary">
                    View in The Vault
                  </button>
                </div>
              )}

              {/* Error message */}
              {task?.status === 'ERROR' && (
                <div className="mt-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                  {task.currentStep || task.errorMessage || 'An unexpected error occurred during processing.'}
                </div>
              )}
            </div>
          ) : (
            /* Empty state for /process/new */
            <div className="card p-12 text-center bg-surface shadow-2xl mb-6">
              <Bot size={48} className="mx-auto mb-4 text-text-tertiary opacity-40" />
              <p className="text-text-secondary mb-6">
                Go to <strong className="text-text-primary">Emails</strong> or{' '}
                <strong className="text-text-primary">Classroom</strong> and click&nbsp;
                <span className="text-amber font-semibold">"Process with Miro"</span> on any item to run the AI pipeline.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/emails')} className="btn btn-secondary">
                  Go to Emails
                </button>
                <button onClick={() => navigate('/classroom')} className="btn btn-secondary">
                  Go to Classroom
                </button>
              </div>
            </div>
          )}

          {/* Extracted Text / Current Step Accordion */}
          {task && (
            <div className="card overflow-hidden">
              <button
                onClick={() => setExtractedOpen(!extractedOpen)}
                className="w-full flex items-center justify-between p-4 bg-surface hover:bg-elevated transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <FileText size={14} /> Processing Details
                </div>
                <ChevronDown
                  size={16}
                  className={`text-text-tertiary transition-transform ${extractedOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {extractedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-white/[0.06] bg-background">
                      <div className="space-y-2 text-sm">
                        <p><span className="text-text-tertiary">Task ID:</span> <span className="text-text-secondary font-mono text-xs">{task.id}</span></p>
                        <p><span className="text-text-tertiary">Source:</span> <span className="text-text-secondary">{task.sourceType} — {task.sourceSubject}</span></p>
                        <p><span className="text-text-tertiary">Status:</span> <span className="text-text-secondary">{task.status}</span></p>
                        <p><span className="text-text-tertiary">Current Step:</span> <span className="text-text-secondary">{task.currentStep}</span></p>
                        <p><span className="text-text-tertiary">Started:</span> <span className="text-text-secondary">{task.startedAt ? new Date(task.startedAt).toLocaleString() : '—'}</span></p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}
