import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const FEATURES = [
  { icon: '📊', title: 'Live Options Chain', desc: 'Real-time NIFTY & BANKNIFTY chain with Greeks, IV skew, and built-in strategy builder.' },
  { icon: '🤖', title: '12-Agent AI System', desc: 'Multi-agent debate system analyzes every trade from technical, fundamental, and risk perspectives.' },
  { icon: '▦', title: 'Market Heatmap', desc: 'Squarified treemap of 180+ stocks with sector-level drill-down and live color coding.' },
  { icon: '🔍', title: 'Pattern Scanner', desc: '50+ technical & fundamental scans — breakouts, ORB, EMA crossovers, momentum plays.' },
  { icon: '📈', title: 'OI Analysis', desc: 'Call/Put OI buildup, PCR trends, max pain, and institutional flow tracking.' },
  { icon: '⚡', title: 'Price Alerts', desc: 'Set instant price alerts on any stock — get notified the moment conditions are met.' },
];

const STATS = [
  { value: '180+', label: 'Stocks Tracked' },
  { value: '50+', label: 'Smart Scans' },
  { value: '12', label: 'AI Agents' },
  { value: '<1s', label: 'Data Refresh' },
];

function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 glass border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center shadow-lg">
              <span className="text-[10px] font-black text-primary-foreground tracking-tight">TA</span>
            </div>
            <span className="text-sm font-black text-foreground tracking-wide">Trade Arsenal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/auth" className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              Get Started Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Orbs */}
        <FloatingOrb className="w-[500px] h-[500px] bg-primary top-20 -left-40" />
        <FloatingOrb className="w-[400px] h-[400px] bg-[hsl(var(--terminal-cyan))] top-40 right-[-100px]" delay={2} />
        <FloatingOrb className="w-[300px] h-[300px] bg-[hsl(var(--terminal-blue))] bottom-20 left-1/3" delay={4} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-semibold text-primary">Live Market Data · Real-Time Analytics</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            <span className="text-foreground">Your </span>
            <span className="text-gradient-primary">F&O Command</span>
            <br />
            <span className="text-foreground">Center</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            AI-powered options analysis, real-time heatmaps, and institutional flow tracking — 
            everything serious traders need, in one terminal.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth"
              className="group px-8 py-3.5 rounded-2xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2">
              Start Trading Free
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a href="#features"
              className="px-8 py-3.5 rounded-2xl text-sm font-semibold border border-border/60 text-foreground hover:bg-secondary/60 hover:border-border transition-all">
              Explore Features
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}
            className="flex items-center justify-center gap-8 md:gap-14 mt-16">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-foreground font-data">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-6 h-10 rounded-full border-2 border-border/40 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-primary/50" />
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-[11px] text-primary font-bold uppercase tracking-[0.2em] mb-3">POWERFUL TOOLS</p>
            <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
              Everything You Need to <span className="text-gradient-primary">Win</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative p-6 rounded-2xl bg-card/60 border border-border/30 hover:border-primary/20 transition-all duration-300 hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.1)]">
                <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <p className="text-[11px] text-primary font-bold uppercase tracking-[0.2em] mb-4">READY TO START?</p>
          <h2 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-6">
            Trade Smarter.<br /><span className="text-gradient-primary">Starting Now.</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
            Join thousands of traders using Trade Arsenal to analyze markets, spot opportunities, and execute with confidence.
          </p>
          <Link to="/auth"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/25">
            Create Free Account →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--terminal-cyan))] flex items-center justify-center">
                <span className="text-[8px] font-black text-primary-foreground">TA</span>
              </div>
              <span className="text-xs font-bold text-foreground">Trade Arsenal</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/disclaimer" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link>
            </div>
          </div>
          <div className="border-t border-border/20 pt-4">
            <p className="text-[9px] text-muted-foreground/50 text-center leading-relaxed">
              ⚠️ Investment in securities market are subject to market risks. Read all related documents carefully before investing.
              Trade Arsenal is not a SEBI-registered Research Analyst, Investment Advisor, or Portfolio Manager.
              All analysis is for informational purposes only — not financial advice.
            </p>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">© {new Date().getFullYear()} Trade Arsenal. Built for Indian F&O traders.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
