import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About Us', to: '/about' },
  { label: 'Docs', to: '/docs' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-2xl border-b border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
            : 'bg-white/75 backdrop-blur-xl border-b border-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
                  <polygon
                    points="14,2 26,8 26,20 14,26 2,20 2,8"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  />
                  <polygon
                    points="14,7 21,11 21,17 14,21 7,17 7,11"
                    fill="white"
                    opacity="0.3"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <circle cx="14" cy="14" r="3.5" fill="#6366f1" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#0A0A0A]">
                Germin8
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'text-black bg-gray-100/90 font-bold'
                        : 'text-gray-600 hover:text-black hover:bg-gray-100/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-black rounded-lg hover:bg-gray-100/60 transition-all duration-150"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl bg-black text-white hover:bg-gray-800 transition-all duration-150 shadow-xs active:scale-95"
              >
                Get Started
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-800 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="md:hidden bg-white/95 backdrop-blur-2xl border-b border-gray-200/80 shadow-lg"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-white bg-black hover:bg-gray-900 rounded-lg text-center transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
