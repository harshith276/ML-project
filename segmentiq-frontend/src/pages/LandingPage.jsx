import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, CheckCircle, Menu, X, ArrowRight } from 'lucide-react';

// Brand Constants
const COLORS = {
  canvas: '#0A0D14',
  surface: '#12151F',
  surfaceElevated: '#1A1E2E',
  border: 'rgba(255,255,255,0.07)',
  textPrimary: '#F0F2FA',
  textMuted: 'rgba(240,242,250,0.50)',
  segments: {
    Champions: '#00D4AA',
    Loyal: '#4A9EFF',
    AtRisk: '#FFB347',
    Hibernating: '#FF6B6B',
    Outlier: '#A78BFA'
  },
  gradientHero: 'linear-gradient(135deg, #00D4AA 0%, #4A9EFF 50%, #A78BFA 100%)',
  gradientCTA: 'linear-gradient(135deg, #00D4AA, #4A9EFF)',
};

// Motion Variants
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const hoverCard = {
  hover: { scale: 1.02, y: -4, transition: { duration: 0.2 } }
};

// --- Sub-components ---

function NavBar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {scrolled && (
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-[#0A0D14]/90 border-b border-slate-200 dark:border-white/10"
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <BrainCircuit size={20} style={{ color: COLORS.segments.Champions }} />
              <span className="font-bold text-lg text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>SegmentIQ</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'How It Works', href: '#features' },
                { label: 'Pipeline', href: '#pipeline' },
                { label: 'Privacy', href: '#privacy' }
              ].map(item => (
                <a key={item.label} href={item.href}
                   className="text-sm font-medium transition-colors cursor-pointer text-slate-500 dark:text-[rgba(240,242,250,0.50)] hover:text-slate-900 dark:hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-4">
              <button onClick={() => navigate('/auth')} className="text-sm font-medium transition-colors text-slate-900 dark:text-[#F0F2FA] hover:text-slate-600 dark:hover:text-white">Sign In</button>
              <button onClick={() => navigate('/auth')} className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-opacity hover:opacity-90"
                      style={{ background: COLORS.gradientCTA, color: COLORS.canvas }}>
                Get Access
              </button>
            </div>

            {/* Mobile Toggle */}
            <button className="md:hidden text-slate-900 dark:text-[#F0F2FA]" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu Drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-t overflow-hidden border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0D14]"
              >
                <div className="px-6 py-4 flex flex-col gap-4">
                  {[
                    { label: 'How It Works', href: '#features' },
                    { label: 'Pipeline', href: '#pipeline' },
                    { label: 'Privacy', href: '#privacy' }
                  ].map(item => (
                    <a key={item.label} href={item.href}
                       onClick={() => setMobileOpen(false)}
                       className="text-base font-medium cursor-pointer text-slate-900 dark:text-[#F0F2FA]">
                      {item.label}
                    </a>
                  ))}
                  <div className="h-px w-full bg-slate-200 dark:bg-white/10" />
                  <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-lg text-sm font-bold bg-white dark:bg-[#1A1E2E] text-slate-900 dark:text-[#F0F2FA]">Sign In</button>
                  <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-lg text-sm font-bold" style={{ background: COLORS.gradientCTA, color: COLORS.canvas }}>Get Access</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center pt-32 pb-16 px-6 overflow-hidden bg-slate-50 dark:bg-[#0A0D14] transition-colors">
      {/* Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(0,212,170,0.12)' }} />
      <div className="absolute top-1/3 left-[60%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'rgba(74,158,255,0.10)' }} />

      {/* Hero Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[800px] flex flex-col items-center text-center gap-6"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                    style={{ background: 'rgba(0,212,170,0.10)', borderColor: 'rgba(0,212,170,0.25)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLORS.segments.Champions }} />
          <span className="text-xs font-semibold" style={{ color: COLORS.segments.Champions }}>100% Local AI · Zero Cloud Egress</span>
        </motion.div>

        <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-[68px] font-bold tracking-tight leading-[1.05]"
                   style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          <span className="text-slate-900 dark:text-[#F0F2FA]">Know your customers.</span><br/>
          <span style={{ background: COLORS.gradientHero, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Act on what matters.</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="text-lg md:text-xl max-w-2xl text-slate-600 dark:text-[rgba(240,242,250,0.50)]">
          SegmentIQ runs RFM analysis and K-Means clustering on your transaction data — then lets you ask plain-English questions to a local AI that never sends your data to the cloud.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
          <button onClick={() => navigate('/auth')} className="px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ background: COLORS.gradientCTA, color: COLORS.canvas }}>
            Explore the dashboard <ArrowRight size={18} />
          </button>
          <a href="#features" className="px-8 py-3.5 rounded-xl font-bold flex items-center justify-center border border-slate-300 dark:border-white/10 text-slate-900 dark:text-[#F0F2FA] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
            See how it works
          </a>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6 mt-8">
          {[
            { icon: '🔒', text: 'Zero data egress' },
            { icon: '🤖', text: 'Local Ollama AI' },
            { icon: '📊', text: 'RFM + K-Means ML' },
          ].map(badge => (
            <div key={badge.text} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-[rgba(240,242,250,0.50)]">
              <span>{badge.icon}</span> {badge.text}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Fake Dashboard Preview */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-5xl mt-20 rounded-2xl shadow-2xl overflow-hidden -mb-32 bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10"
      >
        {/* Browser Chrome */}
        <div className="h-12 flex items-center px-4 gap-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="mx-auto px-4 py-1 rounded text-xs font-mono bg-slate-100 dark:bg-[#0A0D14] text-slate-500 dark:text-[rgba(240,242,250,0.50)]">
            localhost:5173/dashboard
          </div>
        </div>

        {/* Dashboard Mockup Content */}
        <div className="p-6 space-y-6 bg-slate-50">
          {/* Mock KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', val: '990', color: COLORS.segments.Champions },
              { label: 'Avg Spend', val: '₹2,183', color: COLORS.segments.Loyal },
              { label: 'Recency', val: '38 days', color: COLORS.segments.AtRisk },
              { label: 'Outliers', val: '10', color: COLORS.segments.Outlier },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-4 rounded-xl shadow-sm border-t-4" style={{ borderColor: kpi.color }}>
                <div className="text-xl font-bold text-slate-800">{kpi.val}</div>
                <div className="text-xs text-slate-500">{kpi.label}</div>
              </div>
            ))}
          </div>
          {/* Mock Charts Row */}
          <div className="flex gap-4">
            <div className="flex-[3] bg-white rounded-xl shadow-sm h-64 p-4 relative overflow-hidden flex items-center justify-center">
              <div className="absolute font-semibold text-sm text-slate-800 top-4 left-4">Cluster Space Preview</div>
              {/* Fake 3D blobs */}
              <div className="absolute w-24 h-24 rounded-full blur-xl opacity-60 mix-blend-multiply" style={{ background: COLORS.segments.Champions, top: '40%', left: '30%' }} />
              <div className="absolute w-32 h-32 rounded-full blur-xl opacity-60 mix-blend-multiply" style={{ background: COLORS.segments.Loyal, top: '20%', left: '50%' }} />
              <div className="absolute w-20 h-20 rounded-full blur-xl opacity-60 mix-blend-multiply" style={{ background: COLORS.segments.AtRisk, top: '60%', left: '60%' }} />
            </div>
            <div className="flex-[2] bg-white rounded-xl shadow-sm h-64 p-4 flex flex-col justify-end gap-2 items-end">
              <div className="w-full font-semibold text-sm text-slate-800 mb-auto">Distribution</div>
              {[
                { h: '80%', c: COLORS.segments.Champions },
                { h: '60%', c: COLORS.segments.Loyal },
                { h: '40%', c: COLORS.segments.AtRisk },
                { h: '30%', c: COLORS.segments.Hibernating },
              ].map((bar, i) => (
                <div key={i} className="w-full rounded-t" style={{ height: bar.h, background: bar.c }} />
              ))}
            </div>
          </div>
          {/* Mock Table */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
             <div className="font-semibold text-sm text-slate-800">Recent Transactions</div>
             {[1,2,3].map(i => (
               <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                 <div className="text-xs font-mono text-slate-500">cus_9x8...</div>
                 <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700">Champions</div>
                 <div className="text-xs font-bold text-slate-800">₹4,200.00</div>
               </div>
             ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function SegmentsSection() {
  const cards = [
    { name: 'Champions', icon: '🏆', color: '#00e699', rfm: 'High Recency · High Frequency · High Monetary', desc: 'Your best customers. High lifetime value and strong word-of-mouth potential.', action: 'Launch exclusive VIP loyalty programme.', count: '412', glow: 'hover:shadow-[0_10px_40px_-10px_rgba(0,230,153,0.5)]' },
    { name: 'Loyal', icon: '💛', color: '#3b82f6', rfm: 'Mid Recency · High Frequency · Mid Monetary', desc: 'Reliable frequent buyers. They form the stable foundation of your revenue.', action: 'Offer early access to new products.', count: '328', glow: 'hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)]' },
    { name: 'At-Risk', icon: '⚠️', color: '#f59e0b', rfm: 'Low Recency · Mid Frequency · Mid Monetary', desc: 'Previously active, but showing declining engagement. Need immediate attention.', action: 'Deploy time-limited win-back campaign.', count: '145', glow: 'hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)]' },
    { name: 'Hibernating', icon: '🔴', color: '#ef4444', rfm: 'Low Recency · Low Frequency · Low Monetary', desc: 'Near-lost customers. Low on all dimensions. High risk of complete churn.', action: 'Run a last-chance reactivation email.', count: '105', glow: 'hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)]' },
  ];

  return (
    <section id="features" className="pt-48 pb-24 px-6 relative bg-slate-50 dark:bg-[#0A0D14] border-t border-slate-200 dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp} className="mb-16"
        >
          <div className="text-[11px] uppercase tracking-[0.1em] font-medium mb-3" style={{ color: '#00e699' }}>Segments</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Four segments. Infinite clarity.
          </h2>
          <p className="text-lg max-w-2xl text-slate-600 dark:text-[rgba(240,242,250,0.50)]">
            Every customer lands in one of four behavioural groups — automatically, every time you run the pipeline.
          </p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {cards.map(card => (
            <motion.div key={card.name} variants={fadeUp}
                        className={`bg-white dark:bg-[#111318] rounded-xl overflow-hidden p-7 flex flex-col transition-all duration-300 ease-out relative group hover:-translate-y-2 ${card.glow}`}
                        style={{ borderTop: `3px solid ${card.color}` }}>

              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: `${card.color}1A` }}>
                  {card.icon}
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${card.color}26`, color: card.color }}>
                  ~{card.count} customers
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif', color: card.color }}>{card.name}</h3>
              <div className="text-[11px] uppercase tracking-wider font-medium mb-4 text-slate-500 dark:text-[rgba(240,242,250,0.50)]">{card.rfm}</div>
              <p className="text-sm mb-4 leading-relaxed text-slate-700 dark:text-[#F0F2FA]">{card.desc}</p>
              <p className="text-sm italic mt-auto text-slate-500 dark:text-[rgba(240,242,250,0.50)]">Action: {card.action}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PipelineSection() {
  const steps = [
    { num: '01', title: 'Load', desc: 'Database → PostgreSQL 15 ingests raw transactions.', icon: '📥', color: COLORS.segments.Champions },
    { num: '02', title: 'Clean', desc: 'Pandas drops nulls, coerces dates, handles returns.', icon: '🧹', color: COLORS.segments.Champions },
    { num: '03', title: 'Score RFM', desc: 'Per-customer Recency, Frequency, Monetary computed.', icon: '🧮', color: COLORS.segments.Loyal },
    { num: '04', title: 'Shield', desc: 'Local Outlier Factor isolates anomalous spenders.', icon: '🛡️', color: COLORS.segments.Loyal },
    { num: '05', title: 'Cluster', desc: 'K-Means (k=4) assigns behavioural segment labels.', icon: '🧩', color: COLORS.segments.AtRisk },
    { num: '06', title: 'Ask', desc: 'Local Ollama AI answers plain-English questions.', icon: '💬', color: COLORS.segments.Hibernating },
  ];

  return (
    <section id="pipeline" className="py-24 px-6 relative bg-slate-100 dark:bg-[#0D1017] transition-colors">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp} className="mb-16 text-center"
        >
          <div className="text-[11px] uppercase tracking-[0.1em] font-medium mb-3" style={{ color: COLORS.segments.Loyal }}>Pipeline</div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            From raw data to strategy. Automatically.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Desktop dashed connector */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full border-t border-dashed border-slate-300 dark:border-white/10 -translate-y-1/2 z-0" />

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-8 relative z-10"
          >
            {steps.map(step => (
              <motion.div key={step.num} variants={fadeUp} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-[#12151F] shadow-sm">
                <div className="text-5xl font-bold mb-4 bg-clip-text text-transparent"
                     style={{ fontFamily: '"Space Grotesk", sans-serif', backgroundImage: `linear-gradient(135deg, ${step.color}, #F0F2FA)` }}>
                  {step.num}
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-xl" style={{ background: `${step.color}1A` }}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-[#F0F2FA]">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-[rgba(240,242,250,0.50)]">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section id="privacy" className="py-24 px-6 bg-slate-50 dark:bg-[#0A0D14] transition-colors">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="text-[11px] uppercase tracking-[0.1em] font-medium mb-3" style={{ color: COLORS.segments.AtRisk }}>Privacy First</motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Your data never leaves your machine.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg mb-8 leading-relaxed text-slate-600 dark:text-[rgba(240,242,250,0.50)]">
            SegmentIQ uses Ollama to run the LLM locally. No API keys. No cloud calls. No data egress. PostgreSQL runs in Docker on localhost. The AI model (qwen2.5-coder:1.5b) runs on your own GPU/CPU.
          </motion.p>
          <motion.ul variants={staggerContainer} className="space-y-4">
            {[
              '100% local inference via Ollama',
              'PostgreSQL on localhost:5433 — your machine, your data',
              'Zero external API calls from the ML pipeline'
            ].map(item => (
              <motion.li key={item} variants={fadeUp} className="flex items-start gap-3 text-sm font-medium text-slate-800 dark:text-[#F0F2FA]">
                <CheckCircle size={20} className="shrink-0" style={{ color: COLORS.segments.Champions }} />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Right Architecture Diagram */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={staggerContainer} className="relative flex flex-col items-center gap-6">
          {/* Box 1 */}
          <motion.div variants={fadeUp} className="w-64 py-4 rounded-xl text-center border font-semibold z-10 bg-white dark:bg-[#1A1E2E] border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F0F2FA]">
             🌐 Your Browser
          </motion.div>

          <div className="w-px h-10 border-l border-dashed border-slate-300 dark:border-white/20" />

          {/* Box 2 */}
          <motion.div variants={fadeUp} className="w-64 py-4 rounded-xl text-center border-2 font-semibold z-10 relative bg-white dark:bg-[#1A1E2E] text-slate-900 dark:text-[#F0F2FA]" style={{ borderColor: COLORS.segments.Champions }}>
             ⚡ FastAPI + Ollama
             {/* Red X callout */}
             <div className="absolute -right-32 top-1/2 -translate-y-1/2 flex items-center gap-2">
               <div className="w-8 h-px bg-red-500" />
               <div className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                 <X size={14} /> No cloud
               </div>
             </div>
          </motion.div>

          <div className="w-px h-10 border-l border-dashed border-slate-300 dark:border-white/20" />

          {/* Box 3 */}
          <motion.div variants={fadeUp} className="w-64 py-4 rounded-xl text-center border font-semibold z-10 bg-white dark:bg-[#1A1E2E] border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#F0F2FA]">
             🗄️ PostgreSQL Docker
          </motion.div>

          {/* Connecting Labels */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[72px] text-[10px] font-medium px-2 bg-slate-50 dark:bg-[#0A0D14] text-slate-500 dark:text-[rgba(240,242,250,0.50)]">localhost only</div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[72px] text-[10px] font-medium px-2 bg-slate-50 dark:bg-[#0A0D14] text-slate-500 dark:text-[rgba(240,242,250,0.50)]">localhost only</div>
        </motion.div>
      </div>
    </section>
  );
}

function CTABanner() {
  const navigate = useNavigate();

  return (
    <section className="py-32 px-6 relative overflow-hidden bg-slate-50 dark:bg-[#0A0D14] transition-colors">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none"
           style={{ background: 'rgba(0,212,170,0.08)' }} />

      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
        className="max-w-2xl mx-auto text-center relative z-10 flex flex-col items-center"
      >
        <motion.div variants={fadeUp} className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: `${COLORS.segments.Champions}1A` }}>
          <BrainCircuit size={32} style={{ color: COLORS.segments.Champions }} />
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          Ready to understand your customers?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-lg mb-8 text-slate-600 dark:text-[rgba(240,242,250,0.50)]">
          Set up takes 3 minutes. Run the ML pipeline once. Ask your first question in plain English.
        </motion.p>
        <motion.button
          variants={fadeUp}
          onClick={() => navigate('/auth')}
          className="px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity mb-4"
          style={{ background: COLORS.gradientCTA, color: COLORS.canvas }}
        >
          Open the dashboard →
        </motion.button>
        <motion.p variants={fadeUp} className="text-xs text-slate-500 dark:text-[rgba(240,242,250,0.50)]">
          No cloud. No API key. No setup fee.
        </motion.p>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 px-6 bg-slate-50 dark:bg-[#0A0D14] border-t border-slate-200 dark:border-white/10 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium">
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} style={{ color: COLORS.segments.Champions }} />
          <span className="text-slate-900 dark:text-[#F0F2FA]" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>SegmentIQ</span>
        </div>
        <div className="text-slate-500 dark:text-[rgba(240,242,250,0.50)]">
          Built with FastAPI · React · Ollama · scikit-learn
        </div>
        <div className="text-slate-500 dark:text-[rgba(240,242,250,0.50)]">
          © 2026 SegmentIQ. All data stays local.
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const root = document.documentElement;
    // Force landing page to dark mode while this page is mounted
    root.dataset.landingDark = 'true';
    root.classList.add('dark');

    return () => {
      // Remove landing override and re-apply stored theme
      delete root.dataset.landingDark;
      let stored = 'system';
      try { stored = localStorage.getItem('theme') || 'system'; } catch (e) {}
      const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const activeDark = stored === 'dark' || (stored === 'system' && prefers);
      root.classList.toggle('dark', activeDark);
    };
  }, []);

  return (
    <div className="font-sans min-h-screen bg-slate-50 dark:bg-[#0A0D14] transition-colors">
      <NavBar />
      <HeroSection />
      <SegmentsSection />
      <PipelineSection />
      <PrivacySection />
      <CTABanner />
      <Footer />
    </div>
  );
}
