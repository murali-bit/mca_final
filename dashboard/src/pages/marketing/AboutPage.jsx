import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Target, ShieldCheck, ArrowRight } from 'lucide-react';
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

const values = [
  {
    icon: Zap,
    title: 'Speed',
    desc: 'From document upload to MCA submission in under 2 minutes. We eliminate manual data entry and browser-based workflows entirely.',
  },
  {
    icon: Target,
    title: 'Accuracy',
    desc: 'Our AI models are trained on thousands of MCA filings. Field extraction accuracy exceeds 97%, verified against official form schemas.',
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    desc: 'AES-256 encryption at rest, TLS 1.3 in transit, role-based access controls, and full audit trails ensure your data stays safe.',
  },
];

const team = [
  { name: 'Arjun Sharma', role: 'Co-founder & CEO', initials: 'AS' },
  { name: 'Priya Mehra', role: 'Co-founder & CTO', initials: 'PM' },
  { name: 'Rahul Verma', role: 'Head of Product', initials: 'RV' },
  { name: 'Sneha Patel', role: 'Head of Compliance', initials: 'SP' },
];

const milestones = [
  { year: '2022', label: 'Founded', desc: 'Germin8 was incorporated with a vision to modernize MCA compliance for Indian businesses.' },
  { year: '2023', label: 'Platform Launched', desc: 'Launched the Smart Form Hub with support for 20+ MCA forms and manual filing workflows.' },
  { year: '2024', label: 'AI Scanner Released', desc: 'Introduced the AI Document Scanner — cutting average filing time from 45 minutes to under 2 minutes.' },
  { year: '2025', label: 'FileSure API Integration', desc: 'Direct API submission to MCA portal via FileSure, eliminating browser automation entirely.' },
];

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen font-['Google_Sans','Inter',sans-serif] text-black selection:bg-gray-100 selection:text-black">
      <Navbar />

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 relative overflow-hidden bg-white">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-black mb-6 shadow-xs"
          >
            <span>Our Story</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="hero-headline text-4xl sm:text-6xl lg:text-7xl text-black mb-7"
          >
            We're building the future of
            <br />
            MCA compliance
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="font-google text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Germin8 was born out of frustration with how time-consuming, error-prone, and opaque Indian
            corporate compliance had become. We set out to build the platform we always wished existed —
            one that works as hard as your compliance team does.
          </motion.p>
        </div>
      </section>

      {/* ── MISSION QUOTE ── */}
      <section className="py-20 bg-gray-50/70 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.blockquote
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="hero-headline text-2xl sm:text-3xl text-black leading-snug"
          >
            &ldquo;Our mission is to make MCA compliance so effortless that every CA firm, corporate, and
            startup can focus on what truly matters — growing their business.&rdquo;
          </motion.blockquote>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="mt-4 text-xs font-medium text-gray-500 font-google uppercase tracking-wider"
          >
            — Arjun Sharma, Co-founder &amp; CEO
          </motion.p>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Our Values
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              What we stand for
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 bg-white p-7 hover:shadow-lg hover:border-gray-400 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-5 text-black">
                  <v.icon size={20} className="text-black" />
                </div>
                <h3 className="hero-headline text-base text-black mb-2">{v.title}</h3>
                <p className="font-google text-xs sm:text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="py-24 bg-gray-50/70 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Leadership
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              The people behind Germin8
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center rounded-2xl border border-gray-200 bg-white p-7 hover:shadow-md hover:border-gray-400 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold mx-auto mb-4 bg-gray-100 text-black border border-gray-200">
                  {member.initials}
                </div>
                <h3 className="hero-headline text-sm text-black mb-1">{member.name}</h3>
                <p className="font-google text-xs text-gray-500">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold text-black tracking-widest uppercase bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-full font-mono">
              Milestones
            </span>
            <h2 className="hero-headline text-3xl sm:text-4xl text-black mt-4">
              Our journey so far
            </h2>
          </motion.div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className={`relative flex items-start gap-6 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                >
                  {/* Dot */}
                  <div className="absolute left-8 sm:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border-4 border-white shadow-xs mt-1" />

                  {/* Content card */}
                  <div className={`ml-20 sm:ml-0 sm:w-[45%] ${i % 2 !== 0 ? 'sm:mr-auto' : 'sm:ml-auto'}`}>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-gray-400 transition-all">
                      <span className="text-xs font-bold text-black tracking-wider font-mono">{m.year}</span>
                      <h3 className="hero-headline text-sm text-black mt-1 mb-2">{m.label}</h3>
                      <p className="font-google text-xs text-gray-600 leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
            Join us in building the future
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="font-google text-white/70 text-base sm:text-lg mb-10 max-w-xl mx-auto"
          >
            Whether you're a CA firm, corporate, or startup — Germin8 is built for you.
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
              to="/docs"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-medium text-white border border-white/25 hover:border-white/50 hover:bg-white/10 rounded-full transition-all"
            >
              Explore Documentation
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}