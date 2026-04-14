import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Mail, BookOpen, FileText, Zap, Lock, BarChart2,
  CheckCircle, ChevronRight, Star, Sparkles
} from 'lucide-react';

/* ── Animated Counter ── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── Fade-up animation wrapper ── */
const FadeUp = ({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── Hardcoded Unsplash images (no API key needed) ── */
const UNSPLASH = {
  hero:         'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1800&q=85&auto=format&fit=crop',
  students:     'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80&auto=format&fit=crop',
  library:      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80&auto=format&fit=crop',
  laptop:       'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=900&q=80&auto=format&fit=crop',
  avatar1:      'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=80&auto=format&fit=crop&crop=face',
  avatar2:      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=80&auto=format&fit=crop&crop=face',
  avatar3:      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80&auto=format&fit=crop&crop=face',
};

/* ─────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mockupY   = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);

  const features = [
    { number: '01', icon: <Mail size={20} className="text-emerald" />, title: 'Reads Every Email Automatically', desc: 'Milo connects to your Gmail and silently watches for assignments, deadlines, and announcements — no manual checking required.' },
    { number: '02', icon: <FileText size={20} className="text-emerald" />, title: 'AI-Powered Attachment Extraction', desc: 'PDFs, DOCX, PPTX — Milo reads them all with Gemini AI, pulling out rubrics, questions, and key instructions instantly.' },
    { number: '03', icon: <BookOpen size={20} className="text-emerald" />, title: 'Google Classroom Sync', desc: 'Pulling directly from your Classroom feed, Milo ingests coursework, deadlines, and grades into one unified pipeline.' },
    { number: '04', icon: <Zap size={20} className="text-emerald" />, title: 'Auto-Generates Assignments', desc: 'From understanding to output in seconds. Milo drafts assignment solutions, study guides, and Q&A sheets — structured and ready.' },
    { number: '05', icon: <BarChart2 size={20} className="text-emerald" />, title: 'Live Pipeline Dashboard', desc: 'Watch every document being processed in real-time. Your pipeline is visible, traceable, and always audit-ready.' },
    { number: '06', icon: <Lock size={20} className="text-emerald" />, title: 'Zero Data Retention', desc: 'OAuth-only credentials, never stored. All processing happens locally through encrypted sessions — your data stays yours.' },
  ];

  const steps = [
    { step: '1', label: 'Connect', detail: 'Sign in with your university Google account in one click.' },
    { step: '2', label: 'Sync',    detail: 'Milo scans Gmail and Classroom for new assignments and materials.' },
    { step: '3', label: 'Process', detail: 'Gemini AI reads every attachment and extracts academic content.' },
    { step: '4', label: 'Deliver', detail: 'Find structured notes, solutions and summaries in your Vault.' },
  ];

  const testimonials = [
    { quote: 'Milo processed 3 months of assignment emails in under a minute. I went from overwhelmed to completely organised overnight.', name: 'Priya S.', role: 'CS Major, IIT Bombay', avatar: UNSPLASH.avatar1 },
    { quote: 'It literally read my physics lab PDF and produced a perfectly formatted answer sheet. I still cannot believe this is real.', name: 'Aditya R.', role: 'Engineering, BITS Pilani', avatar: UNSPLASH.avatar2 },
    { quote: 'The Classroom sync is what got me. Everything — deadlines, materials, grades — all in one place and auto-summarised.', name: 'Meera K.', role: 'BBA Student, Symbiosis', avatar: UNSPLASH.avatar3 },
  ];

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white overflow-x-hidden font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center border-b border-white/[0.06] bg-[#0D0D0F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.06] border border-white/10 flex items-center justify-center group-hover:border-emerald/40 transition-colors">
              <img src="/logo.png" alt="Milo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-white/90">Milo AI</span>
          </button>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/40 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-white/40 hover:text-white transition-colors hidden sm:block">Log in</button>
            <button onClick={() => navigate('/login')} className="h-9 px-5 rounded-full bg-emerald hover:bg-emerald-hover text-black text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen pt-16 pb-0 overflow-hidden">

        {/* Hero background photo */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-0 pointer-events-none">
          <img
            src={UNSPLASH.hero}
            alt=""
            className="w-full h-full object-cover object-center opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0F]/40 via-[#0D0D0F]/70 to-[#0D0D0F]" />
        </motion.div>

        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald/[0.08] rounded-full blur-[120px]" />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.12]" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)',
          }} />
        </div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-6 pt-16"
        >
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 h-8 px-4 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/50 text-xs font-medium mb-8 hover:bg-white/[0.08] cursor-default transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse shadow-[0_0_6px_#10b981]" />
            AI Automation Engine — Now Live
            <ChevronRight size={13} className="opacity-40" />
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-[86px] font-bold leading-[1.02] tracking-tighter mb-6">
            Your academic life,{' '}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #10B981 0%, #34D399 60%, #6EE7B7 100%)' }}>
              automated.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/45 max-w-2xl leading-relaxed mb-10 font-normal">
            Milo connects to your university Gmail and Google Classroom, reads every attachment and produces structured assignments, summaries, and study guides — completely on autopilot.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <button onClick={() => navigate('/login')} className="group flex items-center gap-2 h-13 px-8 py-3.5 rounded-full bg-white text-black font-bold text-base hover:bg-white/90 hover:shadow-[0_0_50px_rgba(255,255,255,0.18)] transition-all active:scale-95">
              Start for free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center gap-2 h-13 px-8 py-3.5 rounded-full border border-white/[0.1] bg-white/[0.03] text-white/60 font-medium text-base hover:bg-white/[0.07] hover:text-white transition-all">
              Watch Demo
            </button>
          </div>

          <p className="text-xs text-white/25 flex flex-wrap justify-center items-center gap-4">
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald/60" />No credit card</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald/60" />Free forever plan</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald/60" />Cancel anytime</span>
          </p>
        </motion.div>

        {/* Dashboard Mockup — floating below hero text */}
        <motion.div
          style={{ y: mockupY }}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-16 px-4"
        >
          {/* Fade bottom of mockup into section below */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0D0D0F] to-transparent z-20 pointer-events-none" />
          <div className="absolute -inset-x-8 top-8 bottom-0 bg-emerald/[0.04] blur-[60px] rounded-3xl pointer-events-none" />

          <div className="relative rounded-2xl border border-white/[0.08] bg-[#111114] overflow-hidden shadow-[0_50px_130px_rgba(0,0,0,0.9)]">
            {/* Browser chrome */}
            <div className="h-10 bg-[#0A0A0C] border-b border-white/[0.05] flex items-center px-4 gap-2 flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/40" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
              <span className="w-3 h-3 rounded-full bg-green-500/40" />
              <div className="flex-1 mx-6 h-5 rounded bg-white/[0.04] border border-white/[0.04]" />
            </div>
            {/* App shell */}
            <div className="flex h-[440px] overflow-hidden">
              {/* Sidebar */}
              <div className="w-[190px] border-r border-white/[0.05] bg-[#0A0A0C] p-4 flex flex-col gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
                  <div className="w-6 h-6 rounded bg-white/[0.05] flex items-center justify-center">
                    <img src="/logo.png" alt="" className="w-4 h-4 object-contain opacity-60" />
                  </div>
                  <div className="h-2.5 w-14 rounded-full bg-white/[0.08]" />
                </div>
                {['Dashboard', 'Emails', 'Classroom', 'The Vault', 'Settings'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-default ${i === 0 ? 'bg-white/[0.06] border border-white/[0.05]' : ''}`}>
                    <div className={`w-4 h-4 rounded ${i === 0 ? 'bg-emerald/30' : 'bg-white/[0.05]'}`} />
                    <div className="h-2 rounded-full bg-white/[0.07]" style={{ width: `${[75, 55, 80, 70, 55][i]}%` }} />
                  </div>
                ))}
                <div className="mt-auto">
                  <div className="h-9 rounded-xl bg-emerald/[0.1] border border-emerald/[0.2] flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald" />
                    <div className="h-2 w-14 rounded-full bg-emerald/40" />
                  </div>
                </div>
              </div>
              {/* Main content */}
              <div className="flex-1 p-5 overflow-hidden bg-[#0D0D0F]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="h-3 w-52 rounded-full bg-white/[0.15] mb-2" />
                    <div className="h-2 w-72 rounded-full bg-white/[0.05]" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-28 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                    <div className="h-8 w-8 rounded-lg bg-emerald/[0.15] border border-emerald/[0.2]" />
                  </div>
                </div>
                {/* KPI cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[{ label: 'Emails', val: '104', accent: '#10B981' }, { label: 'Files', val: '37', accent: '#818CF8' }, { label: 'Assignments', val: '12', accent: '#A78BFA' }, { label: 'Guides', val: '8', accent: '#34D399' }].map(({ label, val, accent }) => (
                    <div key={label} className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3.5">
                      <div className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">{label}</div>
                      <div className="text-2xl font-bold" style={{ color: accent }}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Activity table */}
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
                  <div className="h-9 border-b border-white/[0.04] bg-white/[0.01] flex items-center px-4">
                    <div className="h-2 w-44 rounded-full bg-white/[0.12]" />
                  </div>
                  {[
                    { w: 72, badge: '#10B98120', bdcolor: '#10B98140', dot: '#10B981' },
                    { w: 55, badge: '', bdcolor: '', dot: '' },
                    { w: 65, badge: '', bdcolor: '', dot: '' },
                    { w: 50, badge: '', bdcolor: '', dot: '' },
                    { w: 70, badge: '#818CF820', bdcolor: '#818CF840', dot: '#818CF8' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.025] last:border-0">
                      <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: row.badge || 'rgba(255,255,255,0.04)' }} />
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-white/[0.08] mb-1.5" style={{ width: `${row.w}%` }} />
                        <div className="h-1.5 rounded-full bg-white/[0.03]" style={{ width: `${row.w * 0.6}%` }} />
                      </div>
                      {row.dot && (
                        <div className="flex-shrink-0 h-5 w-20 rounded-full border flex items-center justify-center gap-1.5" style={{ borderColor: row.bdcolor, background: row.badge }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: row.dot }} />
                          <div className="h-1.5 w-10 rounded-full" style={{ background: row.dot + '60' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          UNIVERSITY SOCIAL PROOF STRIP
      ══════════════════════════════════════════ */}
      <section className="py-14 border-y border-white/[0.05] bg-white/[0.01]">
        <FadeUp className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/25 mb-8">
            Trusted by students at top universities
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-5 max-w-4xl mx-auto">
            {['MIT', 'Stanford', 'IIT Bombay', 'UC Berkeley', 'Georgia Tech', 'Carnegie Mellon'].map(uni => (
              <span key={uni} className="text-sm font-bold text-white/15 hover:text-white/35 transition-colors tracking-wide">{uni}</span>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
          {[
            { val: 50000, suffix: '+', label: 'Files Processed' },
            { val: 12000, suffix: '+', label: 'Students Using Milo' },
            { val: 98,    suffix: '%', label: 'Extraction Accuracy' },
            { val: 4,     suffix: 's', label: 'Avg. Processing Time' },
          ].map(({ val, suffix, label }, i) => (
            <FadeUp key={label} delay={i * 0.1} className="bg-[#0D0D0F] px-8 py-10 flex flex-col items-center text-center">
              <div className="text-4xl md:text-[52px] font-bold text-white tracking-tight leading-none mb-2">
                <Counter to={val} suffix={suffix} />
              </div>
              <div className="text-sm text-white/35 font-medium">{label}</div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FULL-WIDTH PHOTO SECTION (Unsplash)
      ══════════════════════════════════════════ */}
      <section className="px-6 pb-24">
        <FadeUp>
          <div className="max-w-6xl mx-auto relative rounded-3xl overflow-hidden h-[420px] border border-white/[0.06]">
            <img
              src={UNSPLASH.students}
              alt="Students collaborating"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0F] via-[#0D0D0F]/60 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-16 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald mb-4">Why Milo?</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-5">
                Students spend 4+ hours a week just managing academic emails.
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-7">
                Milo gives you those hours back — automatically reading, extracting, and organising everything so you can focus on what matters: actually learning.
              </p>
              <button onClick={() => navigate('/login')} className="self-start flex items-center gap-2 h-11 px-7 rounded-full bg-emerald hover:bg-emerald-hover text-black text-sm font-bold transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                Reclaim Your Time <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-5">
              Everything your academic workflow needs.
            </h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto">
              Six powerful capabilities. One simple tool. No configuration required.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
            {features.map((f, i) => (
              <FadeUp key={f.number} delay={i * 0.07} className="bg-[#0D0D0F] p-8 group hover:bg-[#111114] transition-colors">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center group-hover:border-emerald/30 group-hover:bg-emerald/[0.06] transition-all">
                    {f.icon}
                  </div>
                  <span className="text-xs font-mono text-white/15 mt-1">{f.number}</span>
                </div>
                <h3 className="font-semibold text-[15px] text-white mb-2 leading-snug">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LIBRARY PHOTO + KEY COPY
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <FadeUp delay={0}>
            <div className="relative rounded-3xl overflow-hidden h-[400px] border border-white/[0.06]">
              <img src={UNSPLASH.library} alt="Library" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F]/80 to-transparent" />
              {/* Floating stat card overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-black/60 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Processing Now</span>
                    <span className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_8px_#10b981] animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {['Physics Lab Report — Week 9', 'Database Assignment 3', 'Algorithms Mid-sem Notes'].map((item, i) => (
                      <div key={item} className="flex items-center gap-2.5">
                        <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-emerald' : 'bg-white/20'}`} />
                        <span className="text-xs text-white/60 truncate">{item}</span>
                        {i === 0 && <span className="ml-auto text-[10px] text-emerald font-medium flex-shrink-0">Processing…</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.15} className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald">Intelligence Layer</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter leading-tight">
              Gemini AI reads every document, so you don't have to.
            </h2>
            <p className="text-base text-white/45 leading-relaxed">
              Once an email arrives with attachments, Milo's pipeline kicks in — downloading, parsing, and passing each file through Gemini to extract structured academic content with near-perfect accuracy.
            </p>
            <div className="space-y-4">
              {['Understands PDF, DOCX, PPTX, and image-based scans', 'Extracts rubrics, questions, and key deadlines', 'Generates assignments matching submission format'].map(pt => (
                <div key={pt} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <CheckCircle size={11} className="text-emerald" />
                  </div>
                  <span className="text-sm text-white/60 leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/login')} className="self-start flex items-center gap-2 h-11 px-7 rounded-full border border-white/[0.1] bg-white/[0.03] text-white/70 font-medium text-sm hover:bg-white/[0.07] hover:text-white transition-all">
              See It In Action <ArrowRight size={14} />
            </button>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how" className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-5">
              Up and running in 60 seconds.
            </h2>
            <p className="text-lg text-white/40 max-w-lg mx-auto">
              No setup wizards. No API keys. No configuration files.
            </p>
          </FadeUp>

          <div className="relative grid md:grid-cols-4 gap-8">
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent hidden md:block" />
            {steps.map((s, i) => (
              <FadeUp key={s.step} delay={i * 0.12} className="relative text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#111114] border border-white/[0.07] flex items-center justify-center mx-auto mb-5 relative z-10 group hover:border-emerald/30 hover:bg-emerald/[0.04] transition-all">
                  <span className="text-2xl font-bold text-white/20 group-hover:text-emerald transition-colors">{s.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{s.label}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.detail}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section id="testimonials" className="py-24 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald mb-4">Testimonials</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">What students are saying.</h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all flex flex-col">
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={13} className="text-emerald fill-emerald" />)}
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed mb-7 flex-1 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-white/35">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <section className="py-32 px-6 border-t border-white/[0.05]">
        <FadeUp>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="absolute inset-0 bg-emerald/[0.04] blur-[100px] rounded-full pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 h-8 px-4 rounded-full bg-emerald/[0.08] border border-emerald/[0.2] text-emerald text-xs font-semibold mb-8">
                <Sparkles size={12} /> Free to start — no card required
              </div>
              <h2 className="text-5xl md:text-6xl font-bold tracking-tighter leading-[1.05] mb-6">
                Stop managing your{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #10B981, #6EE7B7)' }}>
                  academic chaos.
                </span>
              </h2>
              <p className="text-lg text-white/45 mb-10 max-w-lg mx-auto">
                Join thousands of students who've put their study lives on autopilot. Connect your Google account and let Milo handle the rest.
              </p>
              <button onClick={() => navigate('/login')} className="group inline-flex items-center gap-2 h-14 px-10 rounded-full bg-white text-black font-bold text-base hover:bg-white/92 hover:shadow-[0_0_60px_rgba(255,255,255,0.18)] transition-all active:scale-95">
                Get Started Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <img src="/logo.png" alt="Milo" className="w-5 h-5 object-contain opacity-50" />
            </div>
            <span className="text-sm font-semibold text-white/30">Milo AI Platform</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/20">
            <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/40 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-white/15">© 2026 Milo AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
