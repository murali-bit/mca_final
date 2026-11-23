import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  FileText,
  Code2,
  FolderOpen,
  Puzzle,
  ShieldCheck,
  Zap,
} from 'lucide-react';

/* ─── Sidebar data ────────────────────────────────────────── */
const sidebarCategories = [
  {
    id: 'getting-started',
    icon: BookOpen,
    label: 'Getting Started',
    items: ['Introduction', 'Quick Start', 'Installation', 'Authentication', 'First Filing'],
  },
  {
    id: 'api-reference',
    icon: Code2,
    label: 'API Reference',
    items: ['Overview', 'Authentication', 'Forms API', 'Documents API', 'Submissions API', 'Webhooks'],
  },
  {
    id: 'mca-forms',
    icon: FileText,
    label: 'MCA Forms',
    items: ['MGT-7', 'AOC-4', 'DIR-3 KYC', 'INC-20A', 'ADT-1', 'Form 8 LLP', 'All Forms →'],
  },
  {
    id: 'integrations',
    icon: Puzzle,
    label: 'Integrations',
    items: ['FileSure API', 'Webhook Setup', 'Zapier', 'REST Clients', 'SDK: Node.js', 'SDK: Python'],
  },
  {
    id: 'security',
    icon: ShieldCheck,
    label: 'Security',
    items: ['Data Encryption', 'Role-based Access', 'Audit Logs', 'SOC 2 Compliance', 'Data Retention'],
  },
];

/* ─── Main article content ────────────────────────────────── */
const mainContent = {
  breadcrumb: ['Docs', 'Getting Started', 'Introduction'],
  title: 'Introduction to Germin8',
  readTime: '5 min read',
  updated: 'November 2024',
  sections: [
    {
      heading: 'What is Germin8?',
      body: `Germin8 is an AI-powered MCA (Ministry of Corporate Affairs) compliance automation platform built for 
CA firms, corporates, and compliance teams across India. It streamlines the entire MCA filing workflow — 
from intelligent document parsing to direct API-based submission via FileSure.`,
    },
    {
      heading: 'Key Capabilities',
      body: `Germin8 offers three core capabilities:
      
• AI Document Scanner — Upload any corporate document and let AI extract and auto-fill MCA form fields.
• Smart Form Hub — Access, fill, and submit all MCA forms in one unified interface.
• FileSure API Integration — Submit filings programmatically without browser automation.`,
    },
    {
      heading: 'Who is this for?',
      body: `Germin8 is designed for:
      
• CA Firms handling compliance for multiple client companies.
• Corporate Legal & Compliance Teams managing in-house filings.
• Startups that need to stay compliant without a dedicated compliance team.`,
    },
    {
      heading: 'Getting Started',
      body: `To get started with Germin8:
      
1. Create a free account at germin8.app
2. Add your company (CIN or company name)
3. Upload a document or choose a form from the Smart Form Hub
4. Let AI extract and fill in the data
5. Review, sign, and submit via FileSure API`,
    },
  ],
};

/* ─── Sidebar Category ────────────────────────────────────── */
function SidebarCategory({ cat, activeItem, onSelect, searchQuery }) {
  const [open, setOpen] = useState(cat.id === 'getting-started');

  const filteredItems = searchQuery
    ? cat.items.filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
    : cat.items;

  if (searchQuery && filteredItems.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#0A0A0A]/70 hover:text-[#0A0A0A] hover:bg-black/4 rounded-lg transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <cat.icon size={15} className="text-[#0A0A0A]/40 group-hover:text-indigo-600 transition-colors" />
          {cat.label}
        </div>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={13} className="text-[#0A0A0A]/30" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-0.5 space-y-0.5">
              {filteredItems.map((item) => (
                <button
                  key={item}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all ${
                    activeItem === item
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100'
                      : 'text-[#0A0A0A]/55 hover:text-[#0A0A0A] hover:bg-black/4'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Code block mock ─────────────────────────────────────── */
function CodeBlock({ code }) {
  return (
    <div className="rounded-xl border border-black/6 overflow-hidden mt-4 mb-6">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0A0A] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
        </div>
        <span className="text-[10px] text-white/30 font-mono">bash</span>
      </div>
      <pre className="bg-[#111] text-green-400 text-xs font-mono px-5 py-4 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────── */
export default function DocsPage() {
  const [activeItem, setActiveItem] = useState('Introduction');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-white min-h-screen font-['Inter',sans-serif] text-[#0A0A0A] flex flex-col">
      {/* ── TOP BAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-black/6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" fill="none" stroke="#0A0A0A" strokeWidth="2" />
              <circle cx="14" cy="14" r="3" fill="#6366f1" />
            </svg>
            <span className="text-base font-bold text-[#0A0A0A]">Germin8</span>
            <span className="text-xs font-medium text-[#0A0A0A]/30 ml-1">Docs</span>
          </Link>

          {/* Search bar (top) */}
          <div className="hidden sm:flex flex-1 max-w-sm items-center gap-2 px-3 py-2 rounded-lg bg-black/4 border border-black/6 focus-within:border-indigo-200 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
            <Search size={14} className="text-[#0A0A0A]/35 shrink-0" />
            <input
              className="flex-1 text-xs text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#0A0A0A]/35"
              placeholder="Search documentation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <kbd className="text-[9px] text-[#0A0A0A]/30 border border-black/8 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </div>

          {/* Right links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/germin8"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-[#0A0A0A]/50 hover:text-[#0A0A0A] transition-colors"
            >
              <ExternalLink size={12} />
              GitHub
            </a>
            <Link
              to="/register"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6">
        {/* ── SIDEBAR ── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 py-8 pr-6 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
          {/* Sidebar search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/4 border border-black/6 mb-5 focus-within:border-indigo-200 transition-all">
            <Search size={13} className="text-[#0A0A0A]/35 shrink-0" />
            <input
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-[#0A0A0A]/35 text-[#0A0A0A]"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories */}
          <nav className="flex-1">
            {sidebarCategories.map((cat) => (
              <SidebarCategory
                key={cat.id}
                cat={cat}
                activeItem={activeItem}
                onSelect={setActiveItem}
                searchQuery={searchQuery}
              />
            ))}
          </nav>

          {/* Footer link */}
          <div className="mt-6 pt-5 border-t border-black/5">
            <a
              href="#"
              className="flex items-center gap-2 text-xs text-[#0A0A0A]/45 hover:text-indigo-600 transition-colors"
            >
              <Zap size={12} />
              API Changelog
              <ExternalLink size={11} className="ml-auto" />
            </a>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 py-10 lg:pl-10 lg:border-l border-black/5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/40 mb-6">
            {mainContent.breadcrumb.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={11} />}
                <span className={i === mainContent.breadcrumb.length - 1 ? 'text-[#0A0A0A]/70 font-medium' : ''}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          {/* Title row */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={18} className="text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-600 tracking-widest uppercase">
                  Getting Started
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">{mainContent.title}</h1>
              <p className="text-xs text-[#0A0A0A]/40 mt-3 flex items-center gap-3">
                <span>{mainContent.readTime}</span>
                <span>·</span>
                <span>Updated {mainContent.updated}</span>
              </p>
            </div>
          </div>

          {/* Content */}
          <motion.div
            key={activeItem}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="prose-custom"
          >
            {mainContent.sections.map((sec) => (
              <div key={sec.heading} className="mb-10">
                <h2 className="text-lg font-bold text-[#0A0A0A] mb-3 pb-2 border-b border-black/5">
                  {sec.heading}
                </h2>
                <p className="text-sm text-[#0A0A0A]/65 leading-7 whitespace-pre-line">{sec.body}</p>
              </div>
            ))}

            {/* Quick start code block */}
            <div className="mb-10">
              <h2 className="text-lg font-bold text-[#0A0A0A] mb-3 pb-2 border-b border-black/5">
                Quick Start via API
              </h2>
              <p className="text-sm text-[#0A0A0A]/65 leading-7 mb-2">
                Install the Germin8 Node.js SDK and submit your first form:
              </p>
              <CodeBlock
                code={`# Install the SDK
npm install @germin8/sdk

# Or with yarn
yarn add @germin8/sdk`}
              />
              <CodeBlock
                code={`import { Germin8Client } from '@germin8/sdk';

const client = new Germin8Client({ apiKey: 'YOUR_API_KEY' });

// Upload a document for AI extraction
const result = await client.documents.extract({
  file: fs.createReadStream('./annual_report.pdf'),
  formType: 'MGT-7',
});

console.log(result.extractedFields);
// { companyName: 'Acme Pvt Ltd', cin: 'U12345MH2020PTC123456', ... }`}
              />
            </div>

            {/* Next steps */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
              <h3 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <ChevronRight size={15} />
                Next Steps
              </h3>
              <ul className="space-y-2.5">
                {['Quick Start Guide', 'API Authentication', 'Uploading Documents', 'Managing MCA Forms'].map(
                  (item) => (
                    <li key={item}>
                      <button
                        onClick={() => setActiveItem(item.split(' ').slice(-1)[0])}
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                      >
                        <ChevronRight size={13} />
                        {item}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </div>
          </motion.div>

          {/* Page nav */}
          <div className="flex items-center justify-between mt-16 pt-6 border-t border-black/5">
            <button className="flex items-center gap-2 text-xs text-[#0A0A0A]/45 hover:text-indigo-600 transition-colors">
              <ChevronRight size={13} className="rotate-180" />
              Previous
            </button>
            <button className="flex items-center gap-2 text-xs text-[#0A0A0A]/45 hover:text-indigo-600 transition-colors">
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </main>

        {/* ── RIGHT TOC ── */}
        <aside className="hidden xl:flex flex-col w-52 shrink-0 py-10 pl-10 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#0A0A0A]/35 tracking-widest uppercase mb-4">
            On this page
          </p>
          <nav className="space-y-2">
            {mainContent.sections.map((sec) => (
              <button
                key={sec.heading}
                className="block text-left text-xs text-[#0A0A0A]/50 hover:text-indigo-600 transition-colors leading-relaxed"
              >
                {sec.heading}
              </button>
            ))}
            <button className="block text-left text-xs text-[#0A0A0A]/50 hover:text-indigo-600 transition-colors">
              Quick Start via API
            </button>
            <button className="block text-left text-xs text-[#0A0A0A]/50 hover:text-indigo-600 transition-colors">
              Next Steps
            </button>
          </nav>

          <div className="mt-8 pt-6 border-t border-black/5">
            <a
              href="#"
              className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/35 hover:text-indigo-600 transition-colors"
            >
              <ExternalLink size={11} />
              Edit this page
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
