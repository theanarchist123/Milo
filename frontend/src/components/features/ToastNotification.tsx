import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToastEvent {
  id: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  sourceUrl?: string;
}

// Global emitter for toasts
export const toastEmitter = {
  listeners: new Set<(t: ToastEvent) => void>(),
  emit(toast: Omit<ToastEvent, 'id'>) {
    const t = { ...toast, id: Math.random().toString(36).substring(2, 9) };
    this.listeners.forEach(fn => fn(t as ToastEvent));
  },
  subscribe(fn: (t: ToastEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    return toastEmitter.subscribe((toast) => {
      setToasts(prev => [...prev, toast]);
      
      // Auto-dismiss after 10 seconds (increased from 6s for better readability)
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 10000);
    });
  }, []);

  const dismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClick = (toast: ToastEvent) => {
    if (toast.sourceUrl) {
      navigate(toast.sourceUrl);
    }
    dismiss(toast.id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none w-80">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto overflow-hidden rounded-xl shadow-2xl border ${
              toast.type === 'SUCCESS' ? 'bg-success/10 border-success/20 backdrop-blur-md' :
              toast.type === 'ERROR' ? 'bg-danger/10 border-danger/20 backdrop-blur-md' :
              toast.type === 'WARNING' ? 'bg-emerald/10 border-emerald/20 backdrop-blur-md' :
              'bg-surface border-border'
            }`}
          >
            <div 
              className="p-4 flex items-start gap-3 cursor-pointer"
              onClick={() => handleClick(toast)}
            >
              <div className={`mt-0.5 shrink-0 ${
                toast.type === 'SUCCESS' ? 'text-success' :
                toast.type === 'ERROR' ? 'text-danger' :
                toast.type === 'WARNING' ? 'text-emerald' :
                'text-indigo'
              }`}>
                {toast.type === 'SUCCESS' ? <CheckCircle size={18} /> :
                 toast.type === 'WARNING' ? <AlertTriangle size={18} /> :
                 <Bot size={18} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-text-primary mb-1">
                  {toast.title}
                </h4>
                <p className="text-xs text-text-secondary leading-snug">
                  {toast.body}
                </p>
                {toast.sourceUrl && (
                  <span className="inline-block mt-2 text-[11px] font-medium text-emerald hover:text-emerald-light">
                    View Details &rarr;
                  </span>
                )}
              </div>
              
              <button 
                onClick={(e) => dismiss(toast.id, e)}
                className="shrink-0 p-1 text-text-tertiary hover:text-text-primary transition-colors rounded"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
