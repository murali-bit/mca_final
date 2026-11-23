import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Cookie,
  Shield,
  Lock,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Info,
  Calendar,
  FileText,
  Building2,
  ExternalLink,
} from 'lucide-react';
import Navbar from '../../components/marketing/Navbar';
import Footer from '../../components/marketing/Footer';

const cookieTable = [
  {
    name: 'germin8_auth_token',
    category: 'Strictly Necessary',
    provider: 'Germin8 Platform',
    duration: '14 Days',
    purpose: 'Stores secure encrypted JWT authentication session tokens with HTTP-only cookies.',
  },
  {
    name: 'germin8_csrf_token',
    category: 'Strictly Necessary',
    provider: 'Germin8 Platform',
    duration: 'Session',
    purpose: 'Protects statutory form submissions and FileSure API requests against cross-site request forgery.',
  },
  {
    name: 'germin8_cookie_consent_v1',
    category: 'Strictly Necessary',
    provider: 'Germin8 Platform',
    duration: '1 Year',
    purpose: 'Stores your cookie and data privacy preference settings.',
  },
  {
    name: 'filesure_api_handshake',
    category: 'Functional',
    provider: 'FileSure Gateway',
    duration: 'Session',
    purpose: 'Maintains authenticated handshake session with the MCA V3 ROC submission gateway.',
  },
  {
    name: 'germin8_form_draft_cache',
    category: 'Functional',
    provider: 'Germin8 Platform',
    duration: 'Persistent',
    purpose: 'Preserves incomplete draft values for MGT-7, AOC-4, and custom forms during manual entry.',
  },
  {
    name: 'germin8_ocr_telemetry',
    category: 'Analytics',
    provider: 'Germin8 Analytics',
    duration: '30 Days',
    purpose: 'Measures AI document extraction speed and confidence scores to ensure 99.98% platform SLA.',
  },
];

export default function CookiesPage() {
  const handleOpenPreferences = () => {
    window.dispatchEvent(new Event('open-cookie-preferences'));
  };

  return (
    <div className="bg-[#ffffff] min-h-screen font-['Google_Sans','Inter',sans-serif] text-black selection:bg-gray-100 selection:text-black">
      <Navbar />

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/" className="hover:text-black hover:underline">
            Home
          </Link>
          <span>/</span>
          <span>Legal</span>
          <span>/</span>
          <span className="text-black font-medium">Cookie Policy</span>
        </div>

        {/* Header */}
        <div className="mb-12 border-b border-gray-100 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-black mb-4">
            <Cookie size={14} />
            <span>Digital Personal Data Protection Act 2023 Compliant</span>
          </div>

          <h1 className="hero-headline text-4xl sm:text-5xl text-black mb-4">
            Cookie Policy
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Last updated: November 2026
              </span>
              <span>•</span>
              <span>Version 3.2</span>
            </div>

            <button
              onClick={handleOpenPreferences}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition-all text-xs font-medium cursor-pointer shadow-xs active:scale-95"
            >
              <Sliders size={13} />
              Open Cookie Preference Center
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-gray-700 leading-relaxed text-sm">
          {/* Section 1 */}
          <section>
            <h2 className="hero-headline text-xl text-black mb-3">
              1. Introduction
            </h2>
            <p className="mb-3">
              Germin8 (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) provides an enterprise-grade MCA compliance automation and ROC statutory filing SaaS platform. This Cookie Policy explains how we use cookies, local storage objects, and similar telemetry technologies when you visit our website, utilize our FileSure API gateway, or access our role-based portals (Super Admin, Company Admin, Developer, and User).
            </p>
            <p>
              We are committed to full compliance with India&rsquo;s <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>, the <strong>Information Technology Act 2000</strong>, and statutory MCA V3 data governance guidelines. We never sell your corporate or personal compliance telemetry to third-party ad exchanges.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="hero-headline text-xl text-black mb-3">
              2. What Are Cookies?
            </h2>
            <p className="mb-3">
              Cookies are small text files placed on your device (computer, tablet, or smartphone) by web servers when you interact with our website. They allow the platform to remember your active session, authenticate your digital signatures, preserve in-progress form drafts, and analyze system reliability.
            </p>
            <p>
              We use both <strong>session cookies</strong> (which expire automatically when you close your browser) and <strong>persistent cookies</strong> (which remain stored for a predefined duration to retain your role and workspace preferences).
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="hero-headline text-xl text-black mb-4">
              3. Categories of Cookies We Use
            </h2>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-black" />
                    <h3 className="font-semibold text-black">A. Strictly Necessary Cookies</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                    Always Required
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  These cookies are vital for the platform&rsquo;s technical functionality, identity authentication, CSRF attack prevention, and session routing between your browser and our secured compliance cluster. Because the platform cannot operate securely without them, these cannot be disabled.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-black" />
                    <h3 className="font-semibold text-black">B. Functional & Compliance Preferences</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-semibold uppercase">
                    Configurable
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Enable convenient secretarial workflows, such as remembering your active company profile, maintaining offline drafts of AOC-4 or MGT-7 returns, and caching verified director DIN and company CIN records to eliminate repetitive data entry.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-black" />
                    <h3 className="font-semibold text-black">C. Performance & Telemetry</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-semibold uppercase">
                    Configurable
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Help us benchmark AI OCR extraction speeds, monitor FileSure direct pipe latency, track error challans, and maintain our 99.98% filing SLA. Telemetry data is aggregated and contains zero proprietary financial figures.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="hero-headline text-xl text-black mb-3">
              4. Inventory of Active Cookies
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              The following table enumerates standard cookies placed during an authenticated compliance session:
            </p>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-black">Cookie Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Provider</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Duration</th>
                    <th className="px-4 py-3 text-left font-semibold text-black">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {cookieTable.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-black">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.provider}</td>
                      <td className="px-4 py-3 text-gray-600">{item.duration}</td>
                      <td className="px-4 py-3 text-gray-600 leading-relaxed">{item.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="hero-headline text-xl text-black mb-3">
              5. How to Manage and Revoke Consent
            </h2>
            <p className="mb-3">
              You can modify or withdraw your cookie consent at any moment by clicking the button below or using the persistent floating badge at the bottom-left of any platform page:
            </p>
            <div className="my-5 p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-black mb-1">Instant Preference Control</h4>
                <p className="text-xs text-gray-500">
                  Toggle functional, performance, and communication cookies on or off.
                </p>
              </div>
              <button
                onClick={handleOpenPreferences}
                className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-medium transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Configure Settings →
              </button>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Alternatively, you can manage or delete cookies via your browser settings (Chrome, Firefox, Safari, Edge). Please note that blocking essential cookies may disable session authentication and prevent statutory MCA submissions.
            </p>
          </section>

          {/* Section 6 */}
          <section className="pt-6 border-t border-gray-100">
            <h2 className="hero-headline text-xl text-black mb-3">
              6. Contact Data Protection Officer
            </h2>
            <p className="mb-2">
              If you have any questions regarding our cookie practices, DPDP Act 2023 compliance, or data governance protocols, please reach out to our privacy compliance cell:
            </p>
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1 text-xs">
              <p className="font-semibold text-black">Germin8 Compliance Technologies Private Limited</p>
              <p className="text-gray-600">Attn: Data Protection Officer (DPO)</p>
              <p className="text-gray-600">Email: <span className="font-mono text-black">privacy@germin8.com</span></p>
              <p className="text-gray-600">Cyber City, Gurugram, Haryana 122002, India</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
