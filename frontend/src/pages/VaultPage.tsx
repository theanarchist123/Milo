import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Download, FileText } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { OutputCard } from '@/components/features/OutputCard';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { Output } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase';

// Shadcn primitives (simulated UI without full Radix install overhead for now)
function Dialog({ open, onClose, output }: { open: boolean; onClose: () => void; output: Output | null }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!output) return;
    try {
      setDownloading(true);
      // Always build URL from output.id — never trust docxUrl which may be
      // a stale localhost path from an older DB record.
      const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const downloadUrl = `${backendBase}/api/outputs/${output.id}/download`;

      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();

      const res = await fetch(downloadUrl, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${output.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
        <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-white/[0.08] bg-surface/50">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-text-primary line-clamp-2 leading-tight pr-4">{output.title}</h2>
            <p className="text-xs text-text-secondary mt-1">Preview generated content</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-primary py-1.5 px-3 text-sm flex-shrink-0"
            >
              <Download size={14} /> {downloading ? 'Downloading...' : 'Download DOCX'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-border text-text-secondary transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background text-text-secondary">
          <div className="prose prose-invert max-w-3xl mx-auto prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {output.previewText || ''}
            </ReactMarkdown>
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
          
          {/* Unified Vault Workspace Card */}
          <div className="bg-surface rounded-[24px] border border-border p-6 shadow-2xl relative overflow-hidden">
            {/* Absolute ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full sm:w-72 relative z-10">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input 
                  type="text" 
                  placeholder="Search your documents…" 
                  className="input pl-9 h-10 text-sm bg-background/50 border-white/5 focus:border-brand-primary/50 transition-colors rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto relative z-10 p-1 bg-background/40 rounded-xl border border-white/5">
                <Filter size={14} className="text-text-tertiary mx-2 shrink-0" />
                {['ALL', 'ASSIGNMENT', 'SUMMARY', 'QA', 'EXPERIMENT'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap',
                      activeFilter === f 
                        ? 'bg-brand-primary text-white shadow-lg' 
                        : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {f === 'ALL' ? 'All Types' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="relative z-10">
              {filtered.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 mb-6 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05]">
                    <FileText size={32} className="text-text-tertiary opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No documents found</h3>
                  <p className="text-sm text-text-secondary">Try adjusting your filters or generating a new task.</p>
                </div>
              ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-5 sm:gap-6">
              {filtered.map((output, i) => (
                <div key={output.id} className="min-w-0">
                  <OutputCard
                    output={output}
                    index={i}
                    onPreview={setPreviewOutput}
                  />
                </div>
              ))}
            </div>
              )}
            </div>
          </div>
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
