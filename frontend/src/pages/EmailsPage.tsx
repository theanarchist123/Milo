import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Play, Mail, Loader2 } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { EmailCard } from '@/components/features/EmailCard';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { cn, timeAgo, formatFileSize } from '@/lib/utils';
import type { Email } from '@/types';
import { useNavigate } from 'react-router-dom';

const TABS = ['All', 'Assignments', 'Notes', 'Announcements'];

export function EmailsPage() {
  const { emails, loading } = useApi();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const navigate = useNavigate();
  const [processing, setProcessing] = useState<string | null>(null); // email ID being processed
  const [processError, setProcessError] = useState<string | null>(null);

  const filteredEmails = emails.filter((e) => {
    if (activeTab !== 'All') {
      if (activeTab === 'Assignments' && e.classification?.type !== 'ASSIGNMENT') return false;
      if (activeTab === 'Notes' && e.classification?.type !== 'NOTES') return false;
      if (activeTab === 'Announcements' && e.classification?.type !== 'ANNOUNCEMENT') return false;
    }
    if (search && !e.subject.toLowerCase().includes(search.toLowerCase()) && !e.sender.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AnimatedPage>
      <PageWrapper headerTitle="Inbox" headerSubtitle={`${emails.length} emails synced`}>
        <div className="h-full flex gap-1 -m-6 px-6 pb-6">
          
          {/* Left: Email List (Master) */}
          <div className="w-[40%] min-w-[320px] flex flex-col h-full bg-surface border-r border-white/[0.06] -ml-6 border-y-0 relative z-10">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/[0.06] sticky top-0 bg-surface/95 backdrop-blur z-20">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input 
                  type="text" 
                  placeholder="Search emails…" 
                  className="input pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                      activeTab === tab ? 'bg-white text-black' : 'bg-elevated text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-text-tertiary text-sm">No emails found.</div>
              ) : (
                filteredEmails.map((email, i) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    index={i}
                    isSelected={selectedEmail?.id === email.id}
                    onClick={() => setSelectedEmail(email)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Email Detail (Panel) */}
          <div className="flex-1 min-w-0 h-full overflow-hidden bg-background relative">
            <AnimatePresence mode="wait">
              {selectedEmail ? (
                <motion.div
                  key={selectedEmail.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col pt-6 px-8 overflow-y-auto custom-scrollbar pb-10"
                >
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary leading-tight">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="font-medium text-text-primary">{selectedEmail.sender}</span>
                        <span className="text-text-tertiary">•</span>
                        <span className="text-text-secondary">{timeAgo(selectedEmail.date)}</span>
                      </div>
                    </div>
                    {/* Process Button */}
                    <button 
                      onClick={async () => {
                        if (processing) return;
                        setProcessing(selectedEmail.id);
                        setProcessError(null);
                        try {
                          const { apiClient } = await import('@/lib/apiClient');
                          const res = await apiClient.post(`/process/email/${selectedEmail.id}`, {}, { timeout: 120_000 });
                          const taskId = res.data?.id;
                          if (taskId) {
                            navigate(`/process/${taskId}`);
                          }
                        } catch (err: any) {
                          setProcessError(err?.response?.data?.detail || err?.message || 'Processing failed');
                        } finally {
                          setProcessing(null);
                        }
                      }}
                      disabled={processing === selectedEmail.id}
                      className="btn btn-primary flex-shrink-0"
                    >
                      {processing === selectedEmail.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} className="fill-current" />
                      )}
                      {processing === selectedEmail.id ? 'Processing…' : 'Process with Miro'}
                    </button>
                  </div>

                  {/* AI Classification Card */}
                  {selectedEmail.classification && (
                    <div className="bg-amber-muted border border-amber/20 rounded-xl p-4 mb-6 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Filter size={14} className="text-amber" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-text-primary">AI Classification</span>
                          <span className={cn('badge text-[10px]', 
                            selectedEmail.classification.type === 'ASSIGNMENT' ? 'badge-amber' : 
                            selectedEmail.classification.type === 'NOTES' ? 'badge-indigo' : 'badge-teal'
                          )}>
                            {selectedEmail.classification.type}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary">{selectedEmail.classification.summaryOneLine}</p>
                        
                        {selectedEmail.classification.hasDeadline && (
                          <div className="mt-3 inline-flex px-2 py-1 rounded bg-danger/10 border border-danger/20 text-xs font-medium text-danger">
                            Due: {selectedEmail.classification.deadlineText}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedEmail.attachments.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Attachments ({selectedEmail.attachments.length})</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedEmail.attachments.map(att => (
                          <div key={att.attachmentId} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-surface hover:border-white/20 transition-all cursor-pointer group">
                            <div className="w-8 h-8 rounded bg-elevated flex items-center justify-center flex-shrink-0 group-hover:bg-white/10">
                              <span className="text-xs font-bold text-text-secondary">{att.filename.split('.').pop()?.toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{att.filename}</p>
                              <p className="text-[11px] text-text-tertiary mt-0.5">{formatFileSize(att.size)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr className="border-white/[0.06] my-6" />

                  {/* Body */}
                  <div className="prose prose-invert max-w-none text-text-secondary text-sm md:text-base leading-relaxed">
                    {selectedEmail.bodyText.split('\n').map((para, i) => (
                      <p key={i} className="mb-4">{para}</p>
                    ))}
                  </div>
                  
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
                  <Mail size={48} className="mb-4 opacity-20" />
                  <p>Select an email to view</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}
