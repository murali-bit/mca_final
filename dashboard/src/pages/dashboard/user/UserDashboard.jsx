import { useState, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  ScanLine,
  FolderOpen,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  Search,
  Filter,
  Send,
  Paperclip,
  ChevronRight,
  ChevronDown,
  FileImage,
  Star,
  Zap,
  Eye,
  Download,
  Trash2,
  ArrowUpRight,
  Bot,
  X,
  Database,
  RefreshCw,
  Check,
  Building2,
  HelpCircle,
  Sliders,
  Calendar,
  Lock,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Copy,
  Layers,
  PenLine,
  Puzzle,
} from 'lucide-react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import McaFormsHub from '../../../components/McaFormsHub';
import AiScanner from '../../../components/scanner/AiScanner';
import ExtensionSetup from '../../../components/ExtensionSetup';
import { MCA_FORMS } from '../../../data/mcaForms.js';
import { loadDrafts, draftProgress } from '../../../lib/drafts.js';
import clsx from 'clsx';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard/user/overview' },
  { label: 'MCA Forms Hub', icon: FileText, path: '/dashboard/user/forms' },
  { label: 'AI Scanner', icon: ScanLine, path: '/dashboard/user/scanner' },
  { label: 'Document Vault', icon: FolderOpen, path: '/dashboard/user/vault' },
  { label: 'Chrome Extension', icon: Puzzle, path: '/dashboard/user/extension' },
  { label: 'AI Support', icon: MessageCircle, path: '/dashboard/user/support' },
];

const START_FORMS = ['AOC-4', 'ADT-1', 'MGT-7', 'DIR-3-KYC'];

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'ai',
    text: "Hello! I am Germin8's AI compliance assistant. How can I help with your MCA filings today?",
  },
];

const QUICK_QUESTIONS = [
  'AOC-4 due date & penalties?',
  'DIR-3 KYC deadline?',
  'Balance sheet balance check',
  'SRN challan generation',
];

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

// ─── OVERVIEW: start a filing + filings in progress ──────────────────────────
function Overview() {
  const navigate = useNavigate();
  const [formCode, setFormCode] = useState('AOC-4');
  const form = MCA_FORMS.find(f => f.code === formCode) || MCA_FORMS[0];

  const inProgress = useMemo(() => Object.entries(loadDrafts())
    .map(([code, d]) => {
      const f = MCA_FORMS.find(x => x.code === code);
      return f ? { form: f, updatedAt: d.updatedAt, ...draftProgress(f, d.values) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), []);

  const open = (code, mode) => navigate(`/dashboard/user/forms?form=${code}&mode=${mode}`);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      {/* Start a new filing */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="hero-headline text-base text-black">Start a new filing</h2>
          <p className="text-xs text-gray-500 mt-1">Pick the form, then choose how you want to fill it.</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">1 · Which form?</p>
          <div className="flex flex-wrap gap-2">
            {START_FORMS.map(code => {
              const f = MCA_FORMS.find(x => x.code === code);
              if (!f) return null;
              return (
                <button key={code} onClick={() => setFormCode(code)}
                  className={clsx('px-4 py-2 rounded-xl border text-left cursor-pointer transition-all',
                    formCode === code ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black')}>
                  <span className="block text-xs font-bold font-mono">{f.shortLabel || f.code}</span>
                  <span className={clsx('block text-[11px]', formCode === code ? 'text-gray-300' : 'text-gray-500')}>{f.name}</span>
                </button>
              );
            })}
            <button onClick={() => navigate('/dashboard/user/forms?mode=directory')}
              className="px-4 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:border-black hover:text-black cursor-pointer flex items-center gap-1">
              All 58 forms <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            <span className="font-semibold text-black">{form.code}</span> — {form.desc}
            {form.dueDate && <> · Due: {form.dueDate}</>}
            {form.penalty && <> · Late fee: {form.penalty}</>}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">2 · How do you want to fill it?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => open(formCode, 'extractor')}
              className="text-left p-4 rounded-2xl border-2 border-black bg-black text-white hover:bg-gray-800 cursor-pointer transition-all">
              <ScanLine className="w-6 h-6 mb-2" />
              <p className="text-sm font-bold">Scan a document</p>
              <p className="text-[11px] text-gray-300 mt-1">Upload the PDF or photo. Claude reads it and fills the fields; you review before filing.</p>
            </button>
            <button onClick={() => open(formCode, 'manual')}
              className="text-left p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-black cursor-pointer transition-all">
              <PenLine className="w-6 h-6 mb-2 text-black" />
              <p className="text-sm font-bold text-black">Fill manually</p>
              <p className="text-[11px] text-gray-500 mt-1">Type the values section by section, with the required fields marked.</p>
            </button>
          </div>
        </div>
      </section>

      {/* Filings in progress */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="hero-headline text-sm text-black">Your filings in progress</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Drafts are saved in this browser as you work.</p>
        </div>
        {inProgress.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <FileText className="w-6 h-6 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-black mt-2">No filings yet</p>
            <p className="text-xs text-gray-500 mt-1">Start one above. It will show up here so you can continue later.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {inProgress.map(item => (
              <div key={item.form.code} className="px-6 py-3.5 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-mono font-bold text-black shrink-0">{item.form.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-black truncate">{item.form.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-black rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-gray-600">{item.pct}%</span>
                    <span className={clsx('text-[11px]', item.missingRequired ? 'text-amber-700' : 'text-emerald-700')}>
                      {item.missingRequired ? `${item.missingRequired} required missing` : 'Ready to push'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(item.updatedAt)}</span>
                <button onClick={() => open(item.form.code, 'manual')}
                  className="px-3 py-1.5 rounded-full border border-gray-300 text-xs font-semibold text-black hover:bg-gray-100 cursor-pointer shrink-0">
                  Continue
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}

// ─── DOCUMENT VAULT ───────────────────────────────────────────────────────────
function DocumentVault() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-2xl shadow-xs">
      <FolderOpen className="w-8 h-8 text-gray-300 mx-auto" />
      <p className="text-sm font-semibold text-black mt-3">No documents yet</p>
      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
        Document storage isn't connected yet. To pull data out of a filing document, scan it and the extracted values go straight into the form.
      </p>
      <button onClick={() => navigate('/dashboard/user/scanner')}
        className="mt-4 px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
        <ScanLine className="w-4 h-4" /> Scan a document
      </button>
    </motion.div>
  );
}

// ─── AI SUPPORT CHAT TAB (Clean White Theme) ───────────────────────────────────
function AiSupportChat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const bottomRef = useRef();

  const send = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: `Regarding "${text.trim()}": In MCA V3 regulations for Form AOC-4, this requirement is validated through authorized director DIN and auditor membership checks. You can use our integrated FileSure API auto-fill to resolve this without manual typing. Would you like me to pull the filing draft for you?`,
        },
      ]);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white border border-gray-200 rounded-2xl flex flex-col shadow-xs"
      style={{ height: 'calc(100vh - 10rem)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm">G</div>
        <div>
          <p className="hero-headline text-sm text-black">Germin8 AI Support Copilot</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-xs text-gray-400 font-google">MCA V3 Regulatory Engine · FileSure Gateway Verified</p>
          </div>
        </div>
        <Bot className="w-4 h-4 text-gray-400 ml-auto" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx('flex gap-3 max-w-[80%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
          >
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">G</div>
            )}
            <div
              className={clsx(
                'px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed font-google',
                msg.role === 'user'
                  ? 'bg-black text-white rounded-tr-xs'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-xs'
              )}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Questions */}
      <div className="px-5 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:border-black hover:text-black transition-colors whitespace-nowrap cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            className="input-field flex-1 py-2.5 text-xs"
            placeholder="Ask about AOC-4, filing due dates, FileSure API..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className={clsx(
              'px-4 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 text-xs font-semibold cursor-pointer',
              !input.trim() && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN USER / STAFF DASHBOARD ROUTER ──────────────────────────────────────
export default function UserDashboard() {
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [floatMsg, setFloatMsg] = useState('');
  const [floatHistory, setFloatHistory] = useState([
    {
      role: 'ai',
      text: 'Hi! I am your Germin8 AI compliance bot. Need help with AOC-4 fields or FileSure API submission?',
    },
  ]);

  const sendFloat = () => {
    if (!floatMsg.trim()) return;
    const text = floatMsg.trim();
    setFloatHistory((prev) => [...prev, { role: 'user', text }]);
    setFloatMsg('');
    setTimeout(() => {
      setFloatHistory((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Regarding "${text}": You can use the Form dropdown above to switch to AOC-4, run the AI Doc Extractor, or execute direct submission through our FileSure API.`,
        },
      ]);
    }, 700);
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Staff Compliance Portal">
      <div className="p-4 sm:p-6 relative min-h-full bg-white">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="forms" element={<McaFormsHub />} />
          <Route path="scanner" element={<AiScanner />} />
          <Route path="vault" element={<DocumentVault />} />
          <Route path="extension" element={<ExtensionSetup />} />
          <Route path="support" element={<AiSupportChat />} />
        </Routes>

        {/* ── PERSISTENT FLOATING AI COPILOT (Clean Black & White) ── */}
        <div className="fixed bottom-6 right-6 z-40">
          <AnimatePresence>
            {floatingChatOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl w-80 sm:w-96 shadow-2xl border border-gray-200 mb-3 flex flex-col overflow-hidden"
                style={{ height: '420px' }}
              >
                {/* Header */}
                <div className="bg-black text-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      G
                    </div>
                    <div>
                      <p className="hero-headline text-xs text-white leading-none">Germin8 AI Copilot</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-google">Always-on Compliance Assistant</p>
                    </div>
                  </div>
                  <button onClick={() => setFloatingChatOpen(false)} className="text-gray-300 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs font-google">
                  {floatHistory.map((m, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        'p-2.5 rounded-xl max-w-[85%] leading-relaxed',
                        m.role === 'user'
                          ? 'ml-auto bg-black text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200'
                      )}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-2.5 border-t border-gray-100 flex gap-1.5 bg-gray-50/50">
                  <input
                    className="input-field py-1.5 px-3 text-xs flex-1"
                    placeholder="Ask AI anything..."
                    value={floatMsg}
                    onChange={(e) => setFloatMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendFloat()}
                  />
                  <button onClick={sendFloat} className="px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 text-xs font-medium cursor-pointer shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setFloatingChatOpen(!floatingChatOpen)}
            className="w-13 h-13 rounded-full bg-black text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-gray-800 cursor-pointer"
            title="Open AI Support"
          >
            {floatingChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}