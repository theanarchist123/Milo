import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronDown } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { TaskPipeline } from '@/components/features/TaskPipeline';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { useState } from 'react';

export function ProcessorPage() {
  const navigate = useNavigate();
  const [extractedOpen, setExtractedOpen] = useState(false);
  const { emails } = useApi();

  // Determine what we're processing based on route/mock
  const source = emails[0]; // mock fallback

  return (
    <AnimatedPage>
      <PageWrapper>
        <div className="max-w-3xl mx-auto pb-12">
          
          {/* Header Action */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Title Area */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-muted mb-4">
              <FileText size={32} className="text-amber" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Processing task</h1>
            <p className="text-text-secondary">Source: {source?.subject ?? 'Unknown source'}</p>
          </div>

          {/* Main Pipeline Card */}
          <div className="card p-6 md:p-8 relative overflow-hidden bg-surface shadow-2xl mb-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber to-transparent opacity-50" />
            
            <TaskPipeline steps={[]} />
            
            {/* Cancel btn showing only if not done/error */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <button className="btn btn-danger">
                Cancel Processing
              </button>
            </div>
          </div>

          {/* Extracted Text Accordion */}
          <div className="card overflow-hidden">
            <button 
              onClick={() => setExtractedOpen(!extractedOpen)}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <FileText size={14} /> Extracted Text Preview
              </div>
              <ChevronDown size={16} className={`text-text-tertiary transition-transform ${extractedOpen ? 'rotate-180' : ''}`} />
            </button>
            {extractedOpen && (
              <div className="p-4 border-t border-white/[0.06] bg-background">
                <p className="text-xs text-text-tertiary mb-3 text-right">First 500 characters shown</p>
                <div className="p-4 rounded-lg bg-surface border border-white/[0.04] font-mono text-[11px] leading-relaxed text-text-secondary">
                  {`WAVE MECHANICS LAB REPORT TEMPLATE
                  
Student Name: ______________
Date: ______________

1. INTRODUCTION
This experiment investigates the properties of wave interference and diffraction.
Using a ripple tank apparatus, you will observe how plane waves interact with barriers
and separate sources.

2. OBJECTIVES
- Measure the wavelength and frequency of water waves
- Observe diffraction patterns through single and double slits...`}
                </div>
              </div>
            )}
          </div>

        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}
