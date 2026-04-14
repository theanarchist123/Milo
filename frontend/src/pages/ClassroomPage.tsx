import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, FileText, UploadCloud, MessageSquare, Loader2 } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { CourseCard } from '@/components/features/CourseCard';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { CourseItem } from '@/types';

export function ClassroomPage() {
  const { courses, courseItems, loading, fetchCourseItems } = useApi();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'COURSEWORK' | 'MATERIAL' | 'ANNOUNCEMENT'>('COURSEWORK');
  const navigate = useNavigate();

  const handleCourseClick = (id: string) => {
    if (id === selectedCourseId) {
      setSelectedCourseId(null); // Collapse if already open
    } else {
      setSelectedCourseId(id);
      setActiveTab('COURSEWORK');
      fetchCourseItems(id); // Lazy fetch from backend
    }
  };

  const selectedItems = selectedCourseId ? (courseItems[selectedCourseId] ?? []) : [];
  const filteredItems = selectedItems.filter(i => i.type === activeTab);

  return (
    <AnimatedPage>
      <PageWrapper headerTitle="Classroom Hub" headerSubtitle="Connected to Google Classroom">
        <div className="max-w-6xl mx-auto pb-12">
          
          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                isSelected={selectedCourseId === course.id}
                onClick={() => handleCourseClick(course.id)}
              />
            ))}
          </div>

          {/* Expanded Detail Panel */}
          <AnimatePresence>
            {selectedCourseId && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="card bg-surface p-6">
                  
                  {/* Tabs */}
                  <div className="flex items-center gap-6 border-b border-border mb-6">
                    {[
                      { id: 'COURSEWORK', label: 'Assignments' },
                      { id: 'MATERIAL', label: 'Study Materials' },
                      { id: 'ANNOUNCEMENT', label: 'Announcements' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'COURSEWORK' | 'MATERIAL' | 'ANNOUNCEMENT')}
                        className={cn(
                          'pb-3 text-sm font-medium transition-colors relative',
                          activeTab === tab.id ? 'text-emerald' : 'text-text-secondary hover:text-text-primary'
                        )}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div layoutId="courseTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* List */}
                  {filteredItems.length === 0 ? (
                    <div className="p-12 text-center text-text-tertiary">
                      No items found in this category.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredItems.map((item) => (
                        <CourseItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}

function CourseItemRow({ item }: { item: CourseItem }) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [showRollInput, setShowRollInput] = useState(false);
  const [rollNumber, setRollNumber] = useState('');

  const kickOffProcessing = async (roll: string) => {
    if (processing) return;
    setProcessing(true);
    setShowRollInput(false);
    try {
      const { apiClient } = await import('@/lib/apiClient');
      const params = roll ? `?roll_number=${encodeURIComponent(roll)}` : '';
      const res = await apiClient.post(`/process/classroom/${item.id}${params}`, {}, { timeout: 180_000 });
      const taskId = res.data?.id;
      if (taskId) {
        navigate(`/process/${taskId}`);
      }
    } catch (err) {
      console.error('Processing failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessClick = () => {
    // check if description has a spreadsheet/doc link — if so, ask for roll number
    const hasLink = /https?:\/\/docs\.google\.com|https?:\/\/drive\.google\.com/.test(item.description || '');
    if (hasLink) {
      setShowRollInput(true);
    } else {
      kickOffProcessing('');
    }
  };

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-surface hover:border-border transition-colors group">
      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-border">
        {item.type === 'COURSEWORK' ? <FileText size={18} className="text-emerald" /> :
         item.type === 'MATERIAL' ? <UploadCloud size={18} className="text-indigo" /> :
         <MessageSquare size={18} className="text-teal" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
            <p className="text-sm text-text-secondary mt-1">{item.description}</p>
          </div>
          {item.dueDate && (
            <div className="flex-shrink-0 text-right">
              <span className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Due Date</span>
              <p className="text-sm text-danger font-medium mt-0.5">{formatDate(item.dueDate)}</p>
            </div>
          )}
        </div>

        {item.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {item.attachments.map(att => (
              <span key={att.attachmentId} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-surface text-xs text-text-secondary">
                <FileText size={10} />
                {att.filename}
              </span>
            ))}
          </div>
        )}

        {/* Roll-number prompt (shown only for items with attached spreadsheet/doc) */}
        {showRollInput && (
          <div className="mt-3 p-3 rounded-lg bg-emerald/5 border border-emerald/20 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex-1">
              <p className="text-xs text-emerald font-semibold mb-1">📋 Spreadsheet detected — enter your Roll Number</p>
              <p className="text-xs text-text-tertiary">So Miro can find YOUR specific problem assignment from the sheet.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="e.g. 21"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && kickOffProcessing(rollNumber)}
                className="input h-8 w-24 text-sm text-center"
                autoFocus
              />
              <button
                onClick={() => kickOffProcessing(rollNumber)}
                className="btn btn-primary py-1 px-3 text-xs"
              >
                Go ▶
              </button>
              <button
                onClick={() => kickOffProcessing('')}
                className="btn btn-ghost py-1 px-2 text-xs"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded', 
              item.status === 'done' ? 'text-success bg-success/10' :
              item.status === 'classified' ? 'text-emerald bg-emerald/10' : 'text-text-tertiary bg-white/[0.06]'
            )}>
              {item.status.toUpperCase()}
            </span>
            
            <button 
              onClick={handleProcessClick}
              disabled={processing || showRollInput}
              className="btn btn-secondary py-1.5 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {processing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} className="fill-current" />
              )}
              {processing ? 'Processing…' : 'Process with Miro'}
            </button>
        </div>
      </div>
    </div>
  );
}
