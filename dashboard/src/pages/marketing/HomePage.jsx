import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileSearch,
  LayoutGrid,
  Zap,
  ShieldCheck,
  History,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Upload,
  Brain,
  ClipboardCheck,
  Send,
  Building2,
  Lock,
  ChevronRight,
  TrendingUp,
  Activity,
  Check,
  Shield,
  Layers,
  X,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

/* ─── Typewriter Phrases (Pure Black • Google Sans Display) ─── */
const TYPED_PHRASES = [
  'next-gen compliance platform.',
  'Direct FileSure Submissions.',
  'MCA statutory filings.',
  'AI financial extraction.',
  'MGT-7 & AOC-4 returns.',
];

/* ─── Animation helpers ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Telemetry & Feature Data ──────────────────────────── */
const stats = [
  { value: '50,000+', label: 'Statutory Forms Filed', highlight: 'LIVE ROC PIPELINE' },
  { value: '< 2 min', label: 'Average OCR Extraction', highlight: 'AI VISION ENGINE' },
  { value: '99.98%', label: 'FileSure Gateway SLA', highlight: 'ZERO DOWNTIME' },
  { value: '500+', label: 'CA & Corporate Firms', highlight: 'VERIFIED ENTERPRISES' },
];

const features = [
  {
    icon: FileSearch,
    title: 'AI Document Scanner',
    desc: 'Upload audited balance sheets, MOA, or director KYC. Proprietary vision models parse and auto-map MCA V3 fields with 99.4% confidence.',
    badge: 'Vision OCR 3.0',
  },
  {
    icon: Zap,
    title: 'FileSure Direct API Pipe',
    desc: 'Direct programmatic handshake with the MCA V3 portal via FileSure gateway. Immediate SRN generation without manual portal logins.',
    badge: 'Direct Gateway',
  },
  {
    icon: LayoutGrid,
    title: 'All-In-One Forms Hub',
    desc: 'Pre-configured templates for MGT-7, AOC-4, DIR-3 KYC, INC-22A, DPT-3, and custom corporate compliance forms with schema validation.',
    badge: 'MCA V3 Ready',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-Tier Role Governance',
    desc: 'Dedicated portals for Super Super Admin, Company Admin, and Developers with strict seat quota controls and granular filing permissions.',
    badge: 'Enterprise RBAC',
  },
  {
    icon: History,
    title: 'Immutable Audit Trail',
    desc: 'Tamper-proof ledger logging every document scan, DIN validation, data edit, and FileSure API transaction for audit compliance.',
    badge: 'SOC-2 Ready',
  },
  {
    icon: MessageSquare,
    title: 'Razorpay-Style AI Copilot',
    desc: 'Always-active compliance intelligence trained on Companies Act statutes, ROC filing deadlines, and penalty fee calculators.',
    badge: 'Regulatory AI',
  },
];

const steps = [
  { icon: Upload, num: '01', title: 'Upload Documents', desc: 'Drag and drop audited financials, director DIN lists, or PDF balance sheets.' },
  { icon: Brain, num: '02', title: 'AI Extraction', desc: 'Neural OCR extracts CIN, turnover, authorised capital, and director signatures.' },
  { icon: ClipboardCheck, num: '03', title: 'Instant Verification', desc: 'Inspect confidence scores, verify pre-filled fields, and adjust values in 1 click.' },
  { icon: Send, num: '04', title: 'FileSure Submission', desc: 'Transmit directly to MCA ROC with digital signatures and instant SRN challan.' },
];

const plans = [
  {
    name: 'Starter',
    price: '₹2,999',
    period: '/month',
    users: 'Up to 5 team seats',
    desc: 'Perfect for boutique CA firms managing annual returns for growing private limited companies.',
    features: ['5 Core MCA form types', 'AI Document Scanner (100 docs/mo)', 'FileSure API Gateway included', 'Standard email support', 'Single company workspace'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₹7,999',
    period: '/month',
    users: 'Up to 25 team seats',
    desc: 'Built for compliance consulting firms and multi-entity corporates requiring high-volume filing automation.',
    features: ['All statutory MCA form types', 'Unlimited FileSure API submissions', 'Developer API Keys & Webhooks', 'Team role management (Admin/Dev/User)', 'Razorpay-style AI Support Copilot', 'Priority 24/7 dedicated support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '₹24,999',
    period: '/month',
    users: 'Unlimited company seats',
    desc: 'Designed for large audit conglomerates and enterprise finance teams with custom integration needs.',
    features: ['Custom MCA form creator', 'Configurable seat & quota manager', 'Dedicated cloud infrastructure', 'Custom ERP & Tally integration', 'Dedicated Compliance Account Manager', '99.99% uptime SLA guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const trustedFirms = ['Deloitte', 'EY', 'KPMG', 'Grant Thornton', 'BDO', 'PwC', 'Baker Tilly'];

export default function HomePage() {
  const [bannerVisible, setBannerVisible] = useState(true);

  /* ─── Smooth Typewriter Loop (100% Pure Black Text) ─── */
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = TYPED_PHRASES[phraseIndex];
    let timer;

    if (!isDeleting) {
      if (currentText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        }, 65);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (currentText.length > 0) {
        timer = setTimeout(() => {
          setCurrentText(currentPhrase.slice(0, currentText.length - 1));
        }, 32);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % TYPED_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  return (
    <div className="bg-[#ffffff] min-h-screen font-['Google_Sans','Inter',sans-serif] text-black selection:bg-gray-100 selection:text-black">
      {/* ── TOP ANNOUNCEMENT BANNER ── */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-[60] bg-[#ffffff] border-b border-gray-100 text-xs text-black"
          >
            <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between text-[11px] sm:text-xs">
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black text-white font-bold text-[9px] uppercase tracking-wider">
                  ✦ NEW
                </span>
                <span className="font-medium text-gray-700">
                  FileSure Direct Pipe v3.2 is now live with zero-delay SRN generation
                </span>
                <span className="text-gray-300">|</span>
                <Link to="/docs" className="font-semibold text-black hover:underline flex items-center gap-1">
                  Read documentation →
                </Link>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => setBannerVisible(false)}
                  className="p-1 rounded text-gray-400 hover:text-black transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar />

      {/* ── HERO SECTION (EXACT GOOGLE SANS DISPLAY • REGULAR 400 • PURE BLACK • NO PARTICLES • NO CARD) ── */}
      <section className="relative min-h-[88vh] flex flex-col justify-center items-center pt-32 pb-20 px-4 overflow-hidden bg-white">
        {/* Subtle, soft natural gradient wash */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 18%, rgba(0, 0, 0, 0.015) 0%, rgba(255, 255, 255, 0) 70%)',
            }}
          />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          {/* Centered Brand Emblem (Antigravity Style Prism + Germin8) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 mb-6"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,24 2,24" fill="none" stroke="#000000" strokeWidth="2.5" />
                <polygon points="14,9 21,21 7,21" fill="#000000" opacity="0.12" />
              </svg>
            </div>
            <span className="font-display text-base sm:text-lg font-medium text-black tracking-tight">
              Germin8
            </span>
          </motion.div>

          {/* Headline with Typewriter Animation (Exact Google Sans Display • Regular 400 • Pure Black) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mb-6"
          >
            <h1 className="hero-headline text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-black">
              Experience liftoff with the
              <br />
              <span className="hero-headline text-black inline-block mt-1 sm:mt-2 min-h-[1.2em]">
                {currentText}
                <span
                  className="inline-block w-[3.5px] h-[0.88em] bg-black ml-1.5 align-middle rounded-xs animate-cursor"
                  aria-hidden="true"
                />
              </span>
            </h1>
          </motion.div>

          {/* Clean Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="font-google text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10 font-normal"
          >
            Germin8 automates your entire MCA compliance workflow. Scan documents with AI OCR,
            extract statutory data with 99.4% precision, and submit directly through our official FileSure API pipe.
          </motion.p>

          {/* Action CTAs (Google Pill Style) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex items-center justify-center gap-3.5 mb-16"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-200 active:scale-95"
            >
              Start Free Trial →
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-medium text-black bg-gray-100 hover:bg-gray-200/90 rounded-full border border-gray-200/60 transition-all duration-200 active:scale-95"
            >
              Read Docs
            </Link>
          </motion.div>

          {/* Frosted White Natural Telemetry Cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-4xl mx-auto mb-12"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="p-5 rounded-2xl bg-white border border-gray-200/80 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-gray-400 transition-all duration-300"
              >
                <span className="text-[10px] font-bold tracking-widest text-black bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md uppercase font-mono block mb-2 w-fit mx-auto">
                  {s.highlight}
                </span>
                <p className="hero-headline text-3xl text-black">{s.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-snug font-google">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Trust Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.36 }}
            className="flex flex-wrap items-center justify-center gap-2 pt-2"
          >
            <span className="text-xs text-gray-400 font-medium tracking-wider uppercase mr-2 font-google">
              Trusted by compliance leaders:
            </span>
            {trustedFirms.map((firm) => (
              <span
                key={firm}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.02)] font-google"
              >
                {firm}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES SECTION ── */}
      <section className="py-24 bg-gray-50/60 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Enterprise Compliance Suite
            </span>
            <h2 className="hero-headline text-3xl sm:text-5xl text-black mt-4">
              Everything required for seamless MCA automation
            </h2>
            <p className="font-google text-sm sm:text-base text-gray-500 max-w-xl mx-auto mt-3 leading-relaxed">
              Engineered specifically for Chartered Accountants, corporate secretaries, and multi-tenant legal advisory firms.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-7 flex flex-col justify-between border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-gray-400 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all duration-200">
                      <f.icon size={22} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-800 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md uppercase font-mono">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="hero-headline text-base text-black mb-2">{f.title}</h3>
                  <p className="font-google text-xs sm:text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4-STEP HOW IT WORKS FLOW ── */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Automated Pipeline
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              From raw document to filed status in under 2 minutes
            </h2>
          </motion.div>

          <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="hidden lg:block absolute top-9 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="relative mx-auto w-16 h-16 rounded-2xl border-2 border-gray-200 bg-white flex items-center justify-center mb-5 shadow-xs">
                  <step.icon size={24} className="text-black" />
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    {i + 1}
                  </span>
                </div>
                <h3 className="hero-headline text-sm text-black mb-1.5">{step.title}</h3>
                <p className="font-google text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING MATRIX ── */}
      <section className="py-24 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Predictable Pricing
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              Transparent plans tailored for your team size
            </h2>
            <p className="font-google mt-2 text-gray-500 text-sm">Super Admin & Developer can adjust seat allowances directly in the dashboard.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative rounded-2xl border p-7 flex flex-col justify-between ${
                  plan.popular
                    ? 'border-black shadow-xl shadow-gray-200/50 bg-white'
                    : 'border-gray-200 bg-white shadow-xs'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-[10px] font-bold rounded-full tracking-wider uppercase font-mono">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="mb-5">
                    <h3 className="hero-headline text-base text-black mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="hero-headline text-3xl text-black">{plan.price}</span>
                      <span className="text-xs text-gray-500 font-semibold">{plan.period}</span>
                    </div>
                    <p className="text-xs text-gray-700 font-semibold mt-1 font-google">{plan.users}</p>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed font-google">{plan.desc}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-gray-600 font-google">
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to="/register"
                  className={`block text-center py-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                    plan.popular
                      ? 'bg-black text-white hover:bg-gray-900 shadow-md'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGH-CONVERSION CTA FOOTER BANNER ── */}
      <section className="bg-black text-white py-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="hero-headline text-3xl sm:text-5xl mb-5 leading-tight text-white"
          >
            Ready to automate your MCA compliance?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-google text-white/70 text-base sm:text-lg mb-10 max-w-xl mx-auto"
          >
            Join 500+ CA firms already saving hours on every filing cycle. Get started in minutes.
          </motion.p>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-medium text-black bg-white hover:bg-gray-100 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              Start Free Trial →
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-medium text-white border border-white/25 hover:border-white/50 hover:bg-white/10 rounded-full transition-all"
            >
              Sign In to Dashboard
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}