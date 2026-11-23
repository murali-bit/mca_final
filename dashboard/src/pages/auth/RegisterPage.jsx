import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Phone,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    role: 'admin',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 650));

      useAuthStore.setState({
        user: {
          id: 'usr_' + Date.now(),
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company || 'Sharma & Associates LLP',
          role: form.role,
        },
        isAuthenticated: true,
        token: 'token_' + Date.now(),
      });

      navigate('/dashboard/' + form.role);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0c0f17] font-['Inter',sans-serif] text-slate-900">
      {/* ── LEFT SIDE: MINIMALIST LUXURY ARCHITECTURAL SHOWCASE ── */}
      <div className="relative flex-1 hidden lg:flex flex-col justify-between p-12 xl:p-16 text-white overflow-hidden">
        {/* Architectural Image Backdrop */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=85"
            alt="Modern Minimalist Office Interior"
            className="w-full h-full object-cover object-center scale-105"
          />
          {/* Deep cinematic dark overlay with subtle blue tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-gray-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-950/40 to-gray-950/90" />
        </div>

        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="white" strokeWidth="2.5" />
                <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" fill="white" opacity="0.3" stroke="white" strokeWidth="1.5" />
                <circle cx="14" cy="14" r="3.5" fill="#818cf8" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Germin8</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Back to website
          </Link>
        </div>

        {/* Center Typography (Clean, confident, uncluttered) */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-medium text-slate-200 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            FileSure API Direct Gateway • MCA V3
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.14] mb-5">
            Compliance automation for modern firms.
          </h1>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Eliminate hours of manual portal filings. Seamless AI document parsing, instant Director KYC renewals, and direct ROC submission.
          </p>

          <div className="space-y-3 pt-4 border-t border-white/15 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <Check size={14} className="text-emerald-400" />
              <span>Direct FileSure API Gateway integration</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={14} className="text-emerald-400" />
              <span>AI OCR Vision parses balance sheets & KYC in seconds</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check size={14} className="text-emerald-400" />
              <span>Multi-role access for Admins, Developers & Staff</span>
            </div>
          </div>
        </div>

        {/* Bottom Proof Line */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 text-xs text-slate-400">
          <span>Trusted by 500+ CA firms across India</span>
          <span className="text-slate-300 font-medium">99.98% Gateway SLA</span>
        </div>
      </div>

      {/* ── RIGHT SIDE: CLEAN, SOPHISTICATED FULL-HEIGHT PANEL ── */}
      <div className="w-full lg:w-[480px] xl:w-[520px] h-screen h-[100dvh] flex flex-col justify-between bg-[#ffffff] border-l border-gray-100 shadow-2xl p-8 sm:p-12 xl:p-14 overflow-y-auto no-scrollbar">
        {/* Mobile Nav */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs">
              G
            </div>
            <span className="font-bold text-gray-900">Germin8</span>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-gray-600 hover:text-black">
            Sign In →
          </Link>
        </div>

        {/* Main Form Body */}
        <div className="my-auto py-4">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Create an account
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Start automating your MCA compliance workflow in minutes.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@firm.com"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Company / Firm Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Sharma & Associates LLP"
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-xs font-medium text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="admin">Admin (Plan Buyer)</option>
                  <option value="developer">Developer (API Keys)</option>
                  <option value="user">Staff / Filing User</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50/60 hover:bg-white focus:bg-white border border-gray-200 focus:border-black rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-black hover:bg-gray-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <>
                  Create Account <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-black hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Bottom Trust Line */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>Protected by 256-bit encryption</span>
          <span>MCA V3 Ready</span>
        </div>
      </div>
    </div>
  );
}
