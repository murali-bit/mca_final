import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Cookie,
  Shield,
  Check,
  X,
  Sliders,
  Lock,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

const STORAGE_KEY = 'germin8_cookie_consent_v1';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Preference state
  const [preferences, setPreferences] = useState({
    necessary: true, // Always locked to true
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check existing stored preferences
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({ ...prev, ...parsed }));
        setHasInteracted(true);
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      // Delay showing banner slightly for smooth initial page render
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Global listener so footer or other components can reopen preferences
    const handleOpenPreferences = () => {
      setShowModal(true);
      setShowBanner(false);
    };

    window.addEventListener('open-cookie-preferences', handleOpenPreferences);
    return () => {
      window.removeEventListener('open-cookie-preferences', handleOpenPreferences);
    };
  }, []);

  const saveConsent = (updatedPrefs) => {
    const finalPrefs = { ...updatedPrefs, necessary: true, timestamp: new Date().toISOString() };
    setPreferences(finalPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    setShowBanner(false);
    setShowModal(false);
    setHasInteracted(true);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleEssentialOnly = () => {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  const togglePref = (key) => {
    if (key === 'necessary') return; // Cannot toggle strictly necessary
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* ── FLOATING RE-OPEN TRIGGER (Subtle Pill in Bottom Left when closed) ── */}
      {hasInteracted && !showBanner && !showModal && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 left-4 z-40 p-2.5 rounded-full bg-white border border-gray-200/90 text-gray-700 hover:text-black hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 group cursor-pointer"
          title="Manage Cookie Preferences"
          aria-label="Manage Cookie Preferences"
        >
          <Cookie size={17} className="text-gray-700 group-hover:rotate-12 transition-transform duration-200" />
          <span className="hidden sm:inline text-xs font-medium text-gray-600 group-hover:text-black pr-1">
            Cookie Settings
          </span>
        </motion.button>
      )}

      {/* ── QUICK CONSENT FLOATING BANNER ── */}
      <AnimatePresence>
        {showBanner && !showModal && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] text-[#0A0A0A]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
                    <Cookie size={16} />
                  </div>
                  <div>
                    <h3 className="font-['Google_Sans_Display','Google_Sans',sans-serif] text-sm font-medium text-black">
                      Cookie & Privacy Notice
                    </h3>
                    <p className="text-[11px] text-gray-500 font-mono">
                      MCA & DPDP Act 2023 Compliant
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEssentialOnly}
                  className="p-1 text-gray-400 hover:text-black rounded-lg transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X size={15} />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Germin8 uses strictly necessary cookies to keep your compliance sessions secure,
                and optional telemetry cookies to improve FileSure API transmission speeds.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-all duration-150 shadow-xs cursor-pointer text-center"
                >
                  Accept All
                </button>
                <button
                  onClick={handleEssentialOnly}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200/90 rounded-full transition-all duration-150 cursor-pointer text-center"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-black transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <Sliders size={12} />
                  Customize
                </button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <Link
                  to="/cookies"
                  className="hover:text-black hover:underline inline-flex items-center gap-1"
                >
                  Read full Cookie Policy
                  <ExternalLink size={10} />
                </Link>
                <span>Zero third-party trackers sold</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DETAILED COOKIE PREFERENCES MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                    <Cookie size={20} />
                  </div>
                  <div>
                    <h2 className="font-['Google_Sans_Display','Google_Sans',sans-serif] text-lg font-medium text-black">
                      Cookie Preference Center
                    </h2>
                    <p className="text-xs text-gray-500">
                      Manage how Germin8 handles cookies and statutory telemetry.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-black rounded-lg transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Preference Categories */}
              <div className="p-6 overflow-y-auto space-y-4 text-sm divide-y divide-gray-100">
                {/* 1. Strictly Necessary */}
                <div className="pt-2 first:pt-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-black">Strictly Necessary Cookies</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                        Always Active
                      </span>
                    </div>
                    <div className="text-gray-400 flex items-center gap-1 text-xs">
                      <Lock size={13} />
                      Required
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Essential for secure user authentication, CSRF tokens, MCA filing session integrity,
                    and payment processing. The platform cannot function without these.
                  </p>
                </div>

                {/* 2. Functional & Compliance */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-semibold text-black">Functional & Filing Preferences</span>
                      <p className="text-[11px] text-gray-400">Remember DIN, CIN autofill & form draft states</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref('functional')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.functional ? 'bg-black' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={preferences.functional}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          preferences.functional ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Enables persistent workspace preferences, such as keeping in-progress MCA V3 form drafts,
                    auto-populating verified director DINs, and default filing entity selection.
                  </p>
                </div>

                {/* 3. Analytics & Telemetry */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-semibold text-black">Performance & API Latency</span>
                      <p className="text-[11px] text-gray-400">Measure FileSure gateway speed & OCR error rates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref('analytics')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.analytics ? 'bg-black' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={preferences.analytics}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Collects aggregated, anonymized telemetry regarding OCR extraction accuracy, FileSure API handshake
                    latencies, and diagnostic logs to guarantee our 99.98% filing SLA.
                  </p>
                </div>

                {/* 4. Marketing & Announcements */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-semibold text-black">Product Updates & MCA Circulars</span>
                      <p className="text-[11px] text-gray-400">Notifications regarding new MCA rules & features</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePref('marketing')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.marketing ? 'bg-black' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={preferences.marketing}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Helps us inform you of statutory ROC calendar deadlines, regulatory filing penalty updates,
                    and relevant product releases. We never share or sell this data to external ad networks.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  to="/cookies"
                  onClick={() => setShowModal(false)}
                  className="text-xs text-gray-500 hover:text-black hover:underline flex items-center gap-1"
                >
                  <Info size={13} />
                  View full Cookie Policy
                </Link>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handleEssentialOnly}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
                  >
                    Reject Optional
                  </button>
                  <button
                    onClick={handleSaveCustom}
                    className="flex-1 sm:flex-none px-5 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-all shadow-xs cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
