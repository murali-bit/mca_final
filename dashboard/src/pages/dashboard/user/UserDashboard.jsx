import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import McaFormsHub from '../../../components/McaFormsHub';
import clsx from 'clsx';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard/user/overview' },
  { label: 'MCA Forms Hub', icon: FileText, path: '/dashboard/user/forms' },
  { label: 'MCA Directory (58)', icon: Layers, path: '/dashboard/user/forms?mode=directory', badge: '58' },
  { label: 'AI Scanner', icon: ScanLine, path: '/dashboard/user/scanner' },
  { label: 'Document Vault', icon: FolderOpen, path: '/dashboard/user/vault' },
  { label: 'AI Support', icon: MessageCircle, path: '/dashboard/user/support' },
];

/* ─── OVERVIEW STATS (Professional Pure White / Neutral Theme) ─── */
const STAT_CARDS = [
  { label: 'Forms Submitted', value: '24', delta: '+3 this week', icon: FileText },
  { label: 'Pending Forms', value: '5', delta: '2 due soon', icon: Clock },
  { label: 'Documents Scanned', value: '138', delta: '+12 this month', icon: ScanLine },
  { label: "This Month's Filings", value: '8', delta: 'Target: 10', icon: TrendingUp },
];

const RECENT_ACTIVITY = [
  { form: 'MGT-7 Annual Return', date: 'Nov 8, 2026', status: 'Filed', method: 'FileSure API' },
  { form: 'AOC-4 Financial Stmt', date: 'Nov 5, 2026', status: 'Filed', method: 'AI Scan' },
  { form: 'DIR-3 KYC', date: 'Nov 1, 2026', status: 'Draft', method: 'Manual Entry' },
  { form: 'INC-22A Active Status', date: 'Oct 28, 2026', status: 'Due Soon', method: 'FileSure API' },
  { form: 'DPT-3 Return Deposits', date: 'Oct 20, 2026', status: 'Filed', method: 'Manual Entry' },
];

const MOCK_DOCS = [
  { name: 'AOC-4_FY2025.pdf', type: 'pdf', date: 'Nov 5, 2026', size: '1.2 MB' },
  { name: 'DIR-3-KYC_Arjun.pdf', type: 'pdf', date: 'Nov 1, 2026', size: '0.8 MB' },
  { name: 'PAN_Card_scan.png', type: 'img', date: 'Oct 29, 2026', size: '2.3 MB' },
  { name: 'Aadhaar_front.jpg', type: 'img', date: 'Oct 28, 2026', size: '1.8 MB' },
  { name: 'Certificate_Incorp.pdf', type: 'pdf', date: 'Oct 20, 2026', size: '3.1 MB' },
  { name: 'GST_Certificate.pdf', type: 'pdf', date: 'Oct 15, 2026', size: '0.6 MB' },
  { name: 'Balance_Sheet_FY25.pdf', type: 'pdf', date: 'Oct 10, 2026', size: '5.4 MB' },
  { name: 'Utility_Bill.jpg', type: 'img', date: 'Oct 5, 2026', size: '1.1 MB' },
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'ai',
    text: "Hello! I am Germin8's AI compliance assistant. How can I assist with your AOC-4, MGT-7, or FileSure API filings today?",
  },
  { id: 2, role: 'user', text: 'What is the due date for AOC-4 this fiscal year?' },
  {
    id: 3,
    role: 'ai',
    text: 'Form AOC-4 must be filed within 30 days from the conclusion of the Annual General Meeting (AGM). For FY 2025–26, if your AGM is held on September 30, 2026, the due date is October 30, 2026. You can auto-fill all 26 statutory fields in 1-click via FileSure API.',
  },
];

const QUICK_QUESTIONS = [
  'AOC-4 due date & penalties?',
  'DIR-3 KYC deadline?',
  'FileSure API autofill steps',
  'Balance sheet balance check',
  'SRN challan generation',
];

function StatusBadge({ status }) {
  if (!status) return null;
  const cls =
    {
      Filed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      Draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      Ready: 'bg-black text-white',
      'Due Soon': 'bg-amber-50 text-amber-800 border border-amber-200',
    }[status] || 'bg-gray-100 text-gray-700 border border-gray-200';
  return <span className={clsx('badge text-[11px] font-medium font-mono', cls)}>{status}</span>;
}

// ─── OVERVIEW TAB (Unchanged Structure, Upgraded to Crisp Pure White / Black Theme) ──
function Overview() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:border-gray-400 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">{s.label}</p>
                  <p className="hero-headline text-3xl text-black mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1 font-google">{s.delta}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-black">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/dashboard/user/forms?mode=directory')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-medium shadow-xs transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4" /> MCA Master Directory (58)
        </button>
        <button
          onClick={() => navigate('/dashboard/user/forms')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-black hover:border-black text-xs font-medium transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Open MCA Forms Hub
        </button>
        <button
          onClick={() => navigate('/dashboard/user/forms?form=aoc4&mode=extractor')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-black hover:bg-gray-50 text-xs font-medium transition-all cursor-pointer"
        >
          <ScanLine className="w-4 h-4" /> AI Document Scanner
        </button>
        <button
          onClick={() => navigate('/dashboard/user/forms?form=aoc4&mode=filesure')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 text-black hover:bg-gray-200 text-xs font-medium transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4" /> FileSure Direct Submission
        </button>
        <button
          onClick={() => navigate('/dashboard/user/support')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:text-black hover:bg-gray-50 text-xs font-medium transition-all cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" /> AI Copilot Support
        </button>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="hero-headline text-sm text-black">Recent Statutory Filings & Activity</h2>
          <button
            onClick={() => navigate('/dashboard/user/forms')}
            className="text-xs text-black font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Open All Forms <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Form & Purpose</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Method</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Date</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {RECENT_ACTIVITY.map((row) => (
              <tr key={row.form} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-6 py-3.5 font-semibold text-black">{row.form}</td>
                <td className="px-6 py-3.5">
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-black font-mono text-[11px] font-medium border border-gray-200">
                    {row.method}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-gray-500 font-google">{row.date}</td>
                <td className="px-6 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── AI SCANNER TAB (Clean White Theme) ───────────────────────────────────────
const MOCK_EXTRACTED = [
  { field: 'Company Name', value: 'Sharma & Associates Pvt. Ltd.', confidence: 97 },
  { field: 'CIN', value: 'U74999MH2020PTC344123', confidence: 94 },
  { field: 'Director Name', value: 'Priya Sharma', confidence: 99 },
  { field: 'DIN', value: '08765432', confidence: 91 },
  { field: 'Date of Filing', value: '15 October 2026', confidence: 88 },
  { field: 'Authorised Cap.', value: '₹10,00,000', confidence: 85 },
];

function AiScanner() {
  const [uploaded, setUploaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef();

  const handleFile = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setUploaded(true);
    }, 1200);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFile();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-3xl">
      {!uploaded ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 bg-white',
            dragging ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-black hover:bg-gray-50'
          )}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-black">
            {isScanning ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          <div className="text-center">
            <p className="hero-headline text-base text-black">
              {isScanning ? 'AI Engine Extracting OCR Data...' : 'Drop your document here for AI Scanning'}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-google">
              PDF, JPG, PNG up to 25MB — Financial Statements, Audits, KYC documents
            </p>
          </div>
          <button className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold shadow-xs mt-2 cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" /> Choose Document
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-black">Document Analyzed Successfully with AI Scanner</p>
              <p className="text-xs text-gray-500 font-google">6 fields automatically extracted and ready to auto-populate MCA forms</p>
            </div>
            <button
              onClick={() => setUploaded(false)}
              className="ml-auto text-xs text-black font-semibold hover:underline cursor-pointer"
            >
              Scan another
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="hero-headline text-sm text-black">Extracted Fields</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-google">Edit any field or transfer directly to MCA form</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-black text-white text-[10px] font-mono font-bold">
                OCR Engine v3.2
              </span>
            </div>
            <div className="p-4 space-y-3">
              {MOCK_EXTRACTED.map((item) => (
                <div key={item.field} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{item.field}</p>
                  </div>
                  <input defaultValue={item.value} className="input-field flex-1 py-2 text-xs font-medium" />
                  <div className="flex items-center gap-1.5 w-20 shrink-0">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full', item.confidence >= 90 ? 'bg-black' : 'bg-gray-400')}
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 font-mono">{item.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-5 pt-2 flex gap-3">
              <button
                onClick={() => alert('Auto-filled into active AOC-4 draft!')}
                className="flex-1 justify-center py-2.5 px-4 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Auto-Fill MCA Form
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── DOCUMENT VAULT TAB (Clean White Theme) ───────────────────────────────────
function DocumentVault() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="hero-headline text-sm text-black">
          Your Documents &amp; Compliance Vault <span className="text-gray-400 font-normal">({MOCK_DOCS.length} files)</span>
        </h2>
        <button className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {MOCK_DOCS.map((doc, i) => (
          <motion.div
            key={doc.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 group hover:border-gray-400 transition-all shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-black">
              {doc.type === 'pdf' ? <FileText className="w-5 h-5 text-black" /> : <FileImage className="w-5 h-5 text-black" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-black truncate">{doc.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 font-google">{doc.date} · {doc.size}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 text-xs flex-1 justify-center flex cursor-pointer">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 text-xs flex-1 justify-center flex cursor-pointer">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 text-xs flex-1 justify-center flex cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
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