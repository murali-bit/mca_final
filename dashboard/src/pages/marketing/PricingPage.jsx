import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Minus, ChevronDown, Check } from 'lucide-react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Plans Data (Clean Black & Grayscale Styling) ─────────── */
const plans = {
  monthly: [
    {
      name: 'Starter',
      price: '₹2,999',
      period: '/mo',
      users: '5 users included',
      desc: 'Perfect for solo practitioners and boutique CA firms.',
      popular: false,
      features: [
        { label: '5 MCA statutory form types', included: true },
        { label: 'AI Document Scanner (50 docs/mo)', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: false },
        { label: 'Audit Trail (30-day logs)', included: false },
        { label: 'Priority SLA support', included: false },
        { label: 'Dedicated compliance manager', included: false },
        { label: 'Custom ERP & Tally sync', included: false },
      ],
      cta: 'Get Started',
      ctaStyle: 'bg-gray-100 text-black hover:bg-gray-200 border border-gray-200',
    },
    {
      name: 'Professional',
      price: '₹7,999',
      period: '/mo',
      users: '25 users included',
      desc: 'For growing firms that need high-volume MCA automation.',
      popular: true,
      features: [
        { label: 'All statutory MCA form types', included: true },
        { label: 'AI Document Scanner (500 docs/mo)', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: true },
        { label: 'Audit Trail (1-year logs)', included: true },
        { label: 'Priority SLA support', included: true },
        { label: 'Dedicated compliance manager', included: false },
        { label: 'Custom ERP & Tally sync', included: false },
      ],
      cta: 'Start Free Trial →',
      ctaStyle: 'bg-black text-white hover:bg-gray-800 shadow-md',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      users: 'Unlimited company seats',
      desc: 'For multi-entity conglomerates with complex audit workflows.',
      popular: false,
      features: [
        { label: 'All statutory MCA form types', included: true },
        { label: 'Unlimited AI Document Scans', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: true },
        { label: 'Unlimited Audit Trail', included: true },
        { label: 'Priority SLA support', included: true },
        { label: 'Dedicated compliance manager', included: true },
        { label: 'Custom ERP & Tally sync', included: true },
      ],
      cta: 'Talk to Sales',
      ctaStyle: 'bg-gray-100 text-black hover:bg-gray-200 border border-gray-200',
    },
  ],
  annual: [
    {
      name: 'Starter',
      price: '₹2,399',
      period: '/mo',
      users: '5 users included',
      desc: 'Perfect for solo practitioners and boutique CA firms.',
      popular: false,
      features: [
        { label: '5 MCA statutory form types', included: true },
        { label: 'AI Document Scanner (50 docs/mo)', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: false },
        { label: 'Audit Trail (30-day logs)', included: false },
        { label: 'Priority SLA support', included: false },
        { label: 'Dedicated compliance manager', included: false },
        { label: 'Custom ERP & Tally sync', included: false },
      ],
      cta: 'Get Started',
      ctaStyle: 'bg-gray-100 text-black hover:bg-gray-200 border border-gray-200',
    },
    {
      name: 'Professional',
      price: '₹6,399',
      period: '/mo',
      users: '25 users included',
      desc: 'For growing firms that need high-volume MCA automation.',
      popular: true,
      features: [
        { label: 'All statutory MCA form types', included: true },
        { label: 'AI Document Scanner (500 docs/mo)', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: true },
        { label: 'Audit Trail (1-year logs)', included: true },
        { label: 'Priority SLA support', included: true },
        { label: 'Dedicated compliance manager', included: false },
        { label: 'Custom ERP & Tally sync', included: false },
      ],
      cta: 'Start Free Trial →',
      ctaStyle: 'bg-black text-white hover:bg-gray-800 shadow-md',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      users: 'Unlimited company seats',
      desc: 'For multi-entity conglomerates with complex audit workflows.',
      popular: false,
      features: [
        { label: 'All statutory MCA form types', included: true },
        { label: 'Unlimited AI Document Scans', included: true },
        { label: 'FileSure API direct pipe', included: true },
        { label: 'Role-based access controls', included: true },
        { label: 'Unlimited Audit Trail', included: true },
        { label: 'Priority SLA support', included: true },
        { label: 'Dedicated compliance manager', included: true },
        { label: 'Custom ERP & Tally sync', included: true },
      ],
      cta: 'Talk to Sales',
      ctaStyle: 'bg-gray-100 text-black hover:bg-gray-200 border border-gray-200',
    },
  ],
};

/* ─── Comparison Table Rows ───────────────────────────────── */
const tableRows = [
  { label: 'Statutory MCA Form Templates', starter: '5 forms', professional: 'All forms', enterprise: 'All + Custom' },
  { label: 'AI Document Scans / month', starter: '50 docs', professional: '500 docs', enterprise: 'Unlimited' },
  { label: 'Company Team Seats', starter: '5 seats', professional: '25 seats', enterprise: 'Unlimited' },
  { label: 'FileSure API Direct Handshake', starter: true, professional: true, enterprise: true },
  { label: 'Multi-Tier Role Access (RBAC)', starter: false, professional: true, enterprise: true },
  { label: 'Audit Trail Logs', starter: '30 days', professional: '1 year', enterprise: 'Unlimited' },
  { label: 'Regulatory AI Support Copilot', starter: true, professional: true, enterprise: true },
  { label: 'Priority 24/7 SLA Support', starter: false, professional: true, enterprise: true },
  { label: 'Dedicated Account Manager', starter: false, professional: false, enterprise: true },
  { label: '99.98% Gateway SLA Guarantee', starter: false, professional: false, enterprise: true },
];

const faqs = [
  {
    q: 'Is there a free trial available?',
    a: 'Yes. All plans include a 14-day free trial — no credit card required. You can explore all filing automation features before committing.',
  },
  {
    q: 'Can I change my plan or seat limits later?',
    a: 'Absolutely. Company Admins and Super Admins can adjust seat allowances and upgrade plans at any time directly in the dashboard.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major corporate credit/debit cards, UPI, net banking, and NEFT/RTGS for annual plans with instant GST invoicing.',
  },
  {
    q: 'Is our corporate financial data secure on Germin8?',
    a: 'Yes. All documents are encrypted at rest with AES-256 and in transit via TLS 1.3. We undergo continuous audit assessments under Indian DPDP Act standards.',
  },
  {
    q: 'What statutory MCA forms does Germin8 support?',
    a: 'Germin8 supports all standard MCA V3 filings including MGT-7, AOC-4, DIR-3 KYC, INC-22A, DPT-3, ADT-1, and 40+ more with custom schema creator on Enterprise.',
  },
];

/* ─── FAQ Accordion ───────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4.5 text-left bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="hero-headline text-sm text-black">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={16} className="text-gray-400 shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-1 font-google text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-white">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Comparison Cell Helper (Diff Black Highlight) ───────── */
function Cell({ val }) {
  if (val === true) return <CheckCircle2 size={16} className="text-black mx-auto" />;
  if (val === false) return <Minus size={16} className="text-gray-300 mx-auto" />;
  return <span className="font-google text-xs text-black font-medium">{val}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="bg-white min-h-screen font-['Google_Sans','Inter',sans-serif] text-black selection:bg-gray-100 selection:text-black">
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-32 pb-16 text-center relative overflow-hidden bg-white">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-black mb-6 shadow-xs"
          >
            <span>Predictable Pricing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="hero-headline text-4xl sm:text-6xl text-black mb-5"
          >
            Simple, transparent pricing
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="font-google text-base sm:text-lg text-gray-600 mb-10 max-w-xl mx-auto font-normal"
          >
            Start free, scale as you grow. No hidden fees, no surprises.
          </motion.p>

          {/* Monthly / Annual Toggle (Black Pill Highlight) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-gray-100 border border-gray-200"
          >
            {['monthly', 'annual'].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-5 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  billing === b
                    ? 'bg-black text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                    billing === 'annual' ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    Save 20%
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PLAN CARDS (BLACK-FOCUSED HIGHLIGHTS) ── */}
      <section className="pb-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6">
            {plans[billing].map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative rounded-2xl flex flex-col p-8 transition-all duration-300 ${
                  plan.popular
                    ? 'border-2 border-black shadow-[0_16px_40px_rgba(0,0,0,0.08)] bg-white ring-1 ring-black/10'
                    : 'border border-gray-200 bg-white shadow-xs hover:border-gray-400'
                }`}
              >
                {/* Most Popular Badge in Solid Black */}
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-black text-white text-[10px] font-bold rounded-full tracking-widest uppercase font-mono shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="hero-headline text-lg text-black">{plan.name}</h2>
                    {plan.popular && (
                      <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="hero-headline text-4xl text-black">{plan.price}</span>
                    <span className="font-google text-xs text-gray-500 font-semibold">{plan.period}</span>
                  </div>
                  <p className="text-xs text-black font-semibold font-mono mb-2">{plan.users}</p>
                  <p className="font-google text-xs text-gray-600 leading-relaxed">{plan.desc}</p>
                </div>

                {/* Features List with Black Checkmarks */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5 text-xs font-google">
                      {f.included ? (
                        <CheckCircle2 size={15} className="text-black shrink-0 mt-0.5" />
                      ) : (
                        <Minus size={15} className="text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? 'text-gray-800 font-medium' : 'text-gray-400 line-through'}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  to="/register"
                  className={`block text-center py-3 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 bg-gray-50/70 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Audit Matrix
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              Full feature comparison
            </h2>
            <p className="font-google text-xs sm:text-sm text-gray-500 mt-2">
              Compare statutory limits, storage, and developer gateway specifications.
            </p>
          </motion.div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-xs bg-white">
            <table className="w-full text-xs bg-white">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="text-left px-6 py-4 font-semibold text-black w-2/5">Capability</th>
                  {['Starter', 'Professional', 'Enterprise'].map((h) => (
                    <th key={h} className="px-6 py-4 font-bold text-black text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`hover:bg-gray-50/60 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-6 py-3.5 font-google text-gray-800 font-medium">{row.label}</td>
                    <td className="px-6 py-3.5 text-center"><Cell val={row.starter} /></td>
                    <td className="px-6 py-3.5 text-center bg-gray-50/50 font-semibold"><Cell val={row.professional} /></td>
                    <td className="px-6 py-3.5 text-center"><Cell val={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              FAQ
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              Frequently asked questions
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={faq.q}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <FaqItem q={faq.q} a={faq.a} />
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
            Start filing MCA forms in under 2 minutes
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-google text-white/70 text-base sm:text-lg mb-10 max-w-xl mx-auto"
          >
            Join 500+ CA firms already saving hours on every filing cycle. Full access for 14 days.
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