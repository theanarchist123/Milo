import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Download, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { OutputCard } from '@/components/features/OutputCard';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { Output } from '@/types';

// Shadcn primitives (simulated UI without full Radix install overhead for now)
function Dialog({ open, onClose, output }: { open: boolean; onClose: () => void; output: Output | null }) {
  if (!open || !output) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[85vh] bg-surface border border-white/[0.08] shadow-2xl rounded-2xl flex flex-col overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.08] bg-elevated/50">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{output.title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">Preview generated content</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary py-1.5 px-3 text-sm">
              <Download size={14} /> Download DOCX
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-text-secondary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background">
          <div className="prose prose-invert max-w-3xl mx-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-text-secondary leading-relaxed bg-transparent border-0 p-0 m-0">
              {output.previewText}
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function VaultPage() {
  const { outputs, loading } = useApi();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [previewOutput, setPreviewOutput] = useState<Output | null>(null);

  const filtered = outputs.filter(o => {
    if (activeFilter !== 'ALL' && o.type !== activeFilter) return false;
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AnimatedPage>
      <PageWrapper headerTitle="The Vault" headerSubtitle="Every academic document Miro has generated for you">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-white/[0.06]">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input 
                type="text" 
                placeholder="Search documents…" 
                className="input pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <Filter size={14} className="text-text-tertiary mr-1" />
              {['ALL', 'ASSIGNMENT', 'SUMMARY', 'QA', 'EXPERIMENT'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    activeFilter === f ? 'bg-white text-black' : 'hover:bg-elevated text-text-secondary hover:text-text-primary'
                  )}
                >
                  {f === 'ALL' ? 'All Types' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="p-20 text-center text-text-tertiary">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No documents found matching your filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((output, i) => (
                <OutputCard
                  key={output.id}
                  output={output}
                  index={i}
                  onPreview={setPreviewOutput}
                />
              ))}
            </div>
          )}

        </div>
      </PageWrapper>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOutput && (
          <Dialog open={!!previewOutput} onClose={() => setPreviewOutput(null)} output={previewOutput} />
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}
