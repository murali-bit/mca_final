import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download,
  FileText, Plus, RefreshCw, Send, Trash2, Upload, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { API_ORIGIN, pushToExtension } from '../../lib/api';
import {
  getSavedExtensionConfig, sendAoc4ClientToExtension, sendDraftToExtension,
} from '../../lib/extensionConnector';

const API = `${API_ORIGIN}/api/gateway/claude`;
const MAX_BYTES = 20 * 1024 * 1024;
const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

const FORMS = [
  { id: 'AOC-4', label: 'AOC-4 (Financial Statements)', ext: 'aoc4', code: 'AOC-4', hint: 'Audited financial statements: audit report, balance sheet, P&L and notes' },
  { id: 'ADT-1', label: 'ADT-1 (Auditor Appointment)', ext: 'adt1', code: 'ADT-1', hint: 'AGM / board resolution and auditor consent letter' },
  { id: 'MGT-7', label: 'MGT-7 (Annual Return)', ext: 'mgt7', code: 'MGT-7', hint: 'Annual return draft, incorporation certificate, AGM notice' },
  { id: 'DIR-3 KYC', label: 'DIR-3 KYC', ext: 'dir3', code: 'DIR-3-KYC', hint: 'Director PAN, Aadhaar and address proof' },
];

const AOC4_SECTIONS = [
  ['general', 'General Information'],
  ['signatoriesFS', 'Signatories — Financial Statements'],
  ['signatoriesBR', "Signatories — Board's Report"],
  ['auditor', 'Auditor Details'],
  ['balanceSheet', 'Balance Sheet'],
  ['profitLoss', 'Statement of Profit & Loss'],
  ['balanceSheetBreakup', 'Balance Sheet Break-up'],
  ['profitLossDetails', 'Profit & Loss Details'],
  ['shareCapital', 'Share Capital'],
  ['shareholders', 'Shareholders (above 5%)'],
  ['financialParametersBS', 'Financial Parameters — Balance Sheet'],
  ['financialParametersPL', 'Financial Parameters — Profit & Loss'],
  ['principalProducts', 'Principal Products / Services'],
  ['industry', 'Industry & Reporting'],
  ['subsidiary', 'Subsidiary / Joint Venture'],
  ['relatedParty', 'Related Party Transactions'],
  ['auditorReport', "Auditor's Report"],
  ['csr', 'CSR'],
  ['secretarialAudit', 'Secretarial Audit'],
  ['costRecords', 'Cost Records'],
];
const NON_FIELD_KEYS = new Set(['meta', 'clientId', 'displayName', 'source', 'scaleNote']);

const LIAB_KEYS = ['SHARE_CAPITAL', 'RESERVES_SURPLUS', 'MONEY_AGAINST_WARRANTS', 'SHARE_APP_PENDING', 'LONG_TERM_BORROWINGS',
  'DEFERRED_TAX_LIAB', 'OTHER_LONG_TERM_LIAB', 'LONG_TERM_PROVISIONS', 'SHORT_TERM_BORROWINGS', 'TRADE_PAYABLES_MSME',
  'TRADE_PAYABLES_OTHER', 'OTHER_CURRENT_LIAB', 'SHORT_TERM_PROVISIONS'];
const ASSET_KEYS = ['PPE', 'INTANGIBLE_ASSETS', 'CWIP', 'INTANGIBLE_UNDER_DEV', 'NON_CURRENT_INVESTMENTS', 'DEFERRED_TAX_ASSETS',
  'LONG_TERM_LOANS_ADVANCES', 'OTHER_NON_CURRENT_ASSETS', 'CURRENT_INVESTMENTS', 'INVENTORIES', 'TRADE_RECEIVABLES',
  'CASH_EQUIVALENTS', 'SHORT_TERM_LOANS_ADVANCES', 'OTHER_CURRENT_ASSETS'];

const ACRONYMS = new Set(['CIN', 'PAN', 'DIN', 'FY', 'AGM', 'ADT', 'SRN', 'PPE', 'CWIP', 'MSME', 'EPS', 'UDIN', 'CSR',
  'PIN', 'BS', 'PL', 'FS', 'BR', 'JV', 'LT', 'ST', 'FP', 'CAG', 'DOB']);

function humanize(key) {
  const words = key.includes('_') ? key.split('_') : key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  return words.filter(Boolean).map(w => (ACRONYMS.has(w.toUpperCase())
    ? w.toUpperCase()
    : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
}

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isEmpty = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const fmtINR = v => (typeof v === 'number' ? v.toLocaleString('en-IN') : String(v ?? ''));

function setIn(obj, path, value) {
  const next = structuredClone(obj);
  let o = next;
  for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
  o[path[path.length - 1]] = value;
  return next;
}

function pathKey(path) {
  return path.map((p, i) => (typeof p === 'number' ? `[${p}]` : (i ? `.${p}` : p))).join('');
}

function matchesAny(key, list) {
  return (list || []).some(p => key === p || key.startsWith(`${p}.`) || key.startsWith(`${p}[`));
}

function fieldStatus(path, value, meta, edited) {
  const key = pathKey(path);
  if (edited.has(key)) return 'edited';
  if (isEmpty(value)) return 'missing';
  if (matchesAny(key, meta?.uncertain)) return 'check';
  if (matchesAny(key, meta?.derived)) return 'derived';
  if (value === 0 && meta?.nil?.includes(key)) return 'nil';
  return 'found';
}

const STATUS_STYLE = {
  found: { label: 'Found', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  derived: { label: 'Derived', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  nil: { label: 'Nil', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  check: { label: 'Check', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  missing: { label: 'Missing', cls: 'bg-red-50 text-red-600 border-red-200' },
  edited: { label: 'Edited', cls: 'bg-gray-900 text-white border-gray-900' },
};

// Every editable leaf as { path, value } — drives stats, filters and checks.
function collectLeaves(data, schema) {
  const out = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
    else if (isPlainObject(v)) Object.entries(v).forEach(([k, x]) => { if (!NON_FIELD_KEYS.has(k)) walk(x, [...path, k]); });
    else out.push({ path, value: v });
  };
  if (schema === 'aoc4-client') {
    Object.entries(data).forEach(([k, v]) => { if (!NON_FIELD_KEYS.has(k)) walk(v, [k]); });
  } else {
    walk(data, []);
  }
  return out;
}

function sumKeys(o, keys) {
  if (keys.some(k => typeof o?.[k] !== 'number' && o?.[k] !== null && o?.[k] !== undefined)) return null;
  return keys.reduce((s, k) => s + (o?.[k] || 0), 0);
}

function aoc4Checks(d) {
  const checks = [];
  const near = (a, b) => Math.abs(a - b) <= 1;
  const add = (label, a, b, describe) => {
    if (typeof a !== 'number' || typeof b !== 'number') {
      checks.push({ label, ok: null, detail: 'Not enough data to check' });
    } else {
      checks.push({ label, ok: near(a, b), detail: describe(fmtINR(a), fmtINR(b)) });
    }
  };
  const cin = d.general?.CIN || '';
  checks.push({ label: 'CIN format', ok: CIN_RE.test(cin), detail: cin || 'CIN missing' });
  for (const per of ['current', 'previous']) {
    const b = d.balanceSheet?.[per];
    if (!b) continue;
    add(`Balance sheet tallies (${per})`, b.TOTAL_ASSETS, b.TOTAL_EQUITY_LIABILITIES, (x, y) => `Assets ${x} vs Equity + Liabilities ${y}`);
    add(`Equity & liabilities add up (${per})`, sumKeys(b, LIAB_KEYS), b.TOTAL_EQUITY_LIABILITIES, (x, y) => `Lines ${x} vs total ${y}`);
    add(`Assets add up (${per})`, sumKeys(b, ASSET_KEYS), b.TOTAL_ASSETS, (x, y) => `Lines ${x} vs total ${y}`);
  }
  for (const per of ['current', 'previous']) {
    const p = d.profitLoss?.[per];
    if (!p) continue;
    add(`Total income (${per})`, sumKeys(p, ['REVENUE_OPERATIONS', 'OTHER_INCOME']), p.TOTAL_INCOME, (x, y) => `Revenue + other ${x} vs total ${y}`);
    add(`Profit before tax (${per})`, typeof p.TOTAL_INCOME === 'number' && typeof p.TOTAL_EXPENSES === 'number' ? p.TOTAL_INCOME - p.TOTAL_EXPENSES : null,
      p.PROFIT_BEFORE_TAX, (x, y) => `Income − expenses ${x} vs PBT ${y}`);
    add(`Profit after tax (${per})`, typeof p.PROFIT_BEFORE_TAX === 'number' && typeof p.TOTAL_TAX === 'number' ? p.PROFIT_BEFORE_TAX - p.TOTAL_TAX : null,
      p.PROFIT_AFTER_TAX, (x, y) => `PBT − tax ${x} vs PAT ${y}`);
  }
  add('Share capital matches paid-up', d.balanceSheet?.current?.SHARE_CAPITAL, d.shareCapital?.PAID_UP_NOMINAL, (x, y) => `Balance sheet ${x} vs note ${y}`);
  const sigs = (d.signatoriesFS || []).filter(s => /^\d{8}$/.test(String(s.din || '').trim()));
  checks.push({ label: 'Financial statement signatory with DIN', ok: sigs.length > 0, detail: `${sigs.length} signatory(ies) with a valid 8-digit DIN` });
  return checks;
}

// What the extension needs before it will accept a push.
function pushBlocker(formId, data) {
  if (formId === 'AOC-4') return CIN_RE.test(data.general?.CIN || '') ? null : 'Enter a valid CIN in General Information first.';
  if (formId === 'ADT-1' || formId === 'MGT-7') return CIN_RE.test(String(data.cin || '').toUpperCase()) ? null : 'Enter a valid CIN first.';
  if (formId === 'DIR-3 KYC') return /^\d{8}$/.test(String(data.din || '')) ? null : 'Enter the 8-digit DIN first.';
  return null;
}

const JOBS_API = `${API_ORIGIN}/api/extension/jobs`;
const TERMINAL_JOB = new Set(['filled', 'cancelled']);
const EXT_FORM_LABEL = { aoc4: 'AOC-4', adt1: 'ADT-1', mgt7: 'MGT-7', dir3: 'DIR-3 KYC', aoc4_offline: 'AOC-4 Offline', spice_a: 'SPICe+ A', inc32: 'INC-32' };

// What the extension last reported for a job (see extension/js/job-sync.js).
function describeJob(job) {
  const r = job.result || {};
  switch (job.status) {
    case 'ready': return { tone: 'gray', label: 'Queued', text: 'Waiting for the extension to load it' };
    case 'started': return { tone: 'gray', label: 'Loaded', text: 'Loaded in the extension — open the MCA form and start the fill' };
    case 'filling': return {
      tone: 'blue', label: 'Filling',
      text: `Filling: ${r.stepLabel || 'in progress'}${r.totalSteps ? ` (step ${job.phase} of ${r.totalSteps})` : ''}${r.message ? ` — ${r.message}` : ''}`,
    };
    case 'needs_attention': return { tone: 'amber', label: 'Needs attention', text: `Needs attention: ${r.message || r.stepLabel || 'check the extension side panel'}` };
    case 'filled': return { tone: 'green', label: 'Filled', text: 'Filled — review on MCA and submit yourself' };
    case 'cancelled': return { tone: 'gray', label: 'Cancelled', text: 'Cancelled' };
    default: return { tone: 'gray', label: job.status, text: job.status };
  }
}

const TONE = {
  gray: 'text-gray-600 bg-gray-50 border-gray-200',
  blue: 'text-sky-700 bg-sky-50 border-sky-200',
  amber: 'text-amber-800 bg-amber-50 border-amber-200',
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function ageOf(ts) {
  const t = Date.parse(String(ts || '').replace(' ', 'T') + 'Z');
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function readFile(file, as) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(as === 'base64' ? String(reader.result).split(',')[1] : reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    if (as === 'base64') reader.readAsDataURL(file); else reader.readAsText(file);
  });
}

function downloadJson(obj, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── CELLS & SECTIONS ────────────────────────────────────────────────────────

function Cell({ value, onCommit, status }) {
  const numeric = typeof value === 'number';
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const display = focused ? text : (numeric ? fmtINR(value) : (value ?? ''));

  const commit = () => {
    setFocused(false);
    const raw = text.trim();
    let next = raw;
    if (numeric || value === null) {
      const n = Number(raw.replace(/,/g, ''));
      next = raw === '' ? null : (Number.isNaN(n) ? raw : n);
    }
    if (next !== value) onCommit(next);
  };

  return (
    <input
      value={display}
      onFocus={() => { setFocused(true); setText(value === null || value === undefined ? '' : String(value)); }}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      placeholder="—"
      className={clsx(
        'w-full px-2.5 py-1.5 text-xs text-black rounded-lg border bg-white focus:outline-none focus:border-black transition-colors',
        numeric && 'font-mono text-right',
        status === 'missing' ? 'border-red-200 bg-red-50/40' : status === 'check' ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200',
      )}
    />
  );
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status];
  return <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap', s.cls)}>{s.label}</span>;
}

function sectionKind(value) {
  if (Array.isArray(value)) return 'array';
  if (!isPlainObject(value)) return 'scalar';
  if (isPlainObject(value.current) && isPlainObject(value.previous)) return 'period';
  const vals = Object.values(value);
  if (vals.length && vals.every(v => isPlainObject(v) && ('current' in v || 'previous' in v))) return 'pair';
  return 'flat';
}

function SectionBody({ sectionKey, value, ctx }) {
  const base = sectionKey ? [sectionKey] : [];
  const kind = sectionKind(value);
  const show = path => !ctx.reviewOnly || ['missing', 'check'].includes(ctx.statusOf(path));

  if (kind === 'flat') {
    const rows = Object.entries(value).filter(([k, v]) => !NON_FIELD_KEYS.has(k) && !isPlainObject(v) && !Array.isArray(v));
    return (
      <div className="divide-y divide-gray-50">
        {rows.filter(([k]) => show([...base, k])).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(140px,220px)_1fr_64px] gap-3 px-4 py-2 items-center">
            <span className="text-xs text-gray-700 font-medium">{humanize(k)}</span>
            <Cell value={v} status={ctx.statusOf([...base, k])} onCommit={nv => ctx.update([...base, k], nv)} />
            <StatusPill status={ctx.statusOf([...base, k])} />
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'period' || kind === 'pair') {
    const keys = kind === 'period'
      ? [...new Set([...Object.keys(value.current), ...Object.keys(value.previous)])].filter(k => !NON_FIELD_KEYS.has(k))
      : Object.keys(value);
    const cellPath = (k, per) => (kind === 'period' ? [...base, per, k] : [...base, k, per]);
    const cellVal = (k, per) => (kind === 'period' ? value[per]?.[k] : value[k]?.[per]);
    return (
      <div>
        <div className="grid grid-cols-[minmax(140px,1fr)_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Line item</span><span className="text-right">Current year</span><span className="text-right">Previous year</span>
        </div>
        <div className="divide-y divide-gray-50">
          {keys.filter(k => show(cellPath(k, 'current')) || show(cellPath(k, 'previous'))).map(k => (
            <div key={k} className="grid grid-cols-[minmax(140px,1fr)_1fr_1fr] gap-3 px-4 py-2 items-center">
              <span className="text-xs text-gray-700 font-medium">{humanize(k)}</span>
              {['current', 'previous'].map(per => (
                <div key={per} className="flex items-center gap-1.5">
                  <Cell value={cellVal(k, per)} status={ctx.statusOf(cellPath(k, per))} onCommit={nv => ctx.update(cellPath(k, per), nv)} />
                  {['missing', 'check', 'derived', 'edited'].includes(ctx.statusOf(cellPath(k, per))) && (
                    <span title={STATUS_STYLE[ctx.statusOf(cellPath(k, per))].label}
                      className={clsx('w-1.5 h-1.5 rounded-full shrink-0', {
                        missing: 'bg-red-400', check: 'bg-amber-400', derived: 'bg-sky-400', edited: 'bg-gray-900',
                      }[ctx.statusOf(cellPath(k, per))])} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === 'array') {
    const cols = [...new Set(value.flatMap(r => (isPlainObject(r) ? Object.keys(r) : [])))];
    const blank = Object.fromEntries(cols.map(c => [c, typeof value[0]?.[c] === 'number' ? null : '']));
    return (
      <div className="px-4 py-3 space-y-2">
        {value.length === 0 && <p className="text-xs text-gray-400">No rows found in the document.</p>}
        {value.map((row, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr)) 28px` }}>
            {cols.map(c => (
              <div key={c}>
                {i === 0 && <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{humanize(c)}</p>}
                <Cell value={row[c]} status={ctx.statusOf([...base, i, c])} onCommit={nv => ctx.update([...base, i, c], nv)} />
              </div>
            ))}
            <button onClick={() => ctx.update(base, value.filter((_, j) => j !== i))} title="Remove row"
              className={clsx('p-1 text-gray-400 hover:text-red-600 cursor-pointer', i === 0 && 'mt-5')}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {cols.length > 0 && (
          <button onClick={() => ctx.update(base, [...value, { ...blank }])}
            className="text-[11px] font-semibold text-black hover:underline flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Add row
          </button>
        )}
      </div>
    );
  }

  return null;
}

function Section({ title, sectionKey, value, ctx }) {
  const [open, setOpen] = useState(true);
  const leaves = collectLeaves(sectionKey ? { [sectionKey]: value } : value, sectionKey ? 'aoc4-client' : 'flat');
  const missing = leaves.filter(l => ctx.statusOf(l.path) === 'missing').length;
  const check = leaves.filter(l => ctx.statusOf(l.path) === 'check').length;
  if (ctx.reviewOnly && missing + check === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 cursor-pointer text-left">
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        <span className="text-sm font-semibold text-black flex-1">{title}</span>
        <span className="text-[11px] text-gray-500 font-mono">{leaves.length - missing}/{leaves.length} filled</span>
        {check > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">{check} to check</span>}
        {missing > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">{missing} missing</span>}
      </button>
      {open && <div className="border-t border-gray-100"><SectionBody sectionKey={sectionKey} value={value} ctx={ctx} /></div>}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function AiScanner() {
  const [formId, setFormId] = useState('AOC-4');
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [data, setData] = useState(null);
  const [edited, setEdited] = useState(() => new Set());
  const [reviewOnly, setReviewOnly] = useState(false);
  const [push, setPush] = useState(null);
  const [liveJob, setLiveJob] = useState(null);
  const [recentJobs, setRecentJobs] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const form = FORMS.find(f => f.id === formId);

  useEffect(() => {
    if (!scanning) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [scanning]);

  const scan = async (f) => {
    if (!f) return;
    setError(null); setResult(null); setData(null); setPush(null); setEdited(new Set()); setElapsed(0);
    if (f.size > MAX_BYTES) { setError(`${f.name} is ${(f.size / 1048576).toFixed(1)} MB — the limit is 20 MB.`); return; }
    const isBinary = f.type === 'application/pdf' || f.type.startsWith('image/');
    const isText = /\.(txt|csv)$/i.test(f.name) || f.type.startsWith('text/');
    if (!isBinary && !isText) { setError('Upload a PDF, PNG, JPG, WEBP, TXT or CSV file.'); return; }
    setFile(f);
    setScanning(true);
    const t0 = Date.now();
    try {
      const body = isBinary
        ? { fileBase64: await readFile(f, 'base64'), mimeType: f.type, formType: form.id }
        : { text: await readFile(f, 'text'), formType: form.id };
      const res = await fetch(`${API}/${isBinary ? 'vision' : 'extract'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok || !json.extractedFields) throw new Error(json.message || 'Extraction returned no data');
      setResult({ ...json, seconds: ((Date.now() - t0) / 1000).toFixed(0) });
      setData(json.extractedFields);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? `Backend not reachable on ${API_ORIGIN} — is it running?` : err.message);
    } finally {
      setScanning(false);
    }
  };

  const schema = result?.schema === 'aoc4-client' ? 'aoc4-client' : 'flat';
  const meta = data?.meta || {};

  const ctx = useMemo(() => ({
    reviewOnly,
    statusOf: (path) => {
      let v = data;
      for (const p of path) v = v?.[p];
      return fieldStatus(path, v, meta, edited);
    },
    update: (path, value) => {
      setData(d => setIn(d, path, value));
      setEdited(s => new Set(s).add(pathKey(path)));
      setPush(null);
    },
  }), [data, meta, edited, reviewOnly]);

  const leaves = useMemo(() => (data ? collectLeaves(data, schema) : []), [data, schema]);
  const counts = useMemo(() => {
    const c = { found: 0, derived: 0, nil: 0, check: 0, missing: 0, edited: 0 };
    leaves.forEach(l => { c[ctx.statusOf(l.path)]++; });
    return c;
  }, [leaves, ctx]);
  const checks = useMemo(() => (data && schema === 'aoc4-client' ? aoc4Checks(data) : []), [data, schema]);
  const failedChecks = checks.filter(c => c.ok === false).length;

  const sections = useMemo(() => {
    if (!data) return [];
    if (schema !== 'aoc4-client') return [{ key: null, title: `${form.id} Fields`, value: data }];
    const known = AOC4_SECTIONS.filter(([k]) => data[k] !== undefined).map(([k, t]) => ({ key: k, title: t, value: data[k] }));
    const extra = Object.keys(data).filter(k => !NON_FIELD_KEYS.has(k) && !AOC4_SECTIONS.some(([s]) => s === k))
      .map(k => ({ key: k, title: humanize(k), value: data[k] }));
    return [...known, ...extra];
  }, [data, schema, form.id]);

  const companyName = schema === 'aoc4-client'
    ? (data?.general?.COMPANY_NAME || data?.general?.CIN)
    : (data?.companyName || data?.name || data?.firmName || data?.cin || data?.din);
  const blocker = data ? pushBlocker(form.id, data) : null;

  const handlePush = async () => {
    const { meta: _meta, ...payload } = data;
    const clientName = companyName || form.id;
    if (schema === 'aoc4-client') {
      // The CIN is often typed in during review, after the scan assigned a placeholder id.
      payload.clientId = `${payload.general.CIN}_${String(payload.general.FY_TO || '').replace(/\D/g, '')}`.toLowerCase();
      payload.displayName = `${payload.general.COMPANY_NAME || payload.general.CIN} — AOC-4`;
    }
    const clientId = schema === 'aoc4-client'
      ? payload.clientId
      : String(payload.cin || payload.din || `${form.ext}_${Date.now()}`).toLowerCase();
    setPush({ status: 'pushing' });
    const outcome = { status: 'done' };
    try {
      const q = await pushToExtension({ formType: form.ext, clientId, clientName, payload });
      outcome.jobId = q.jobId;
    } catch (err) {
      outcome.queueError = err.message;
    }
    if (getSavedExtensionConfig().extId) {
      const direct = schema === 'aoc4-client'
        ? await sendAoc4ClientToExtension(payload)
        : await sendDraftToExtension(form.code, payload);
      outcome.direct = direct.ok ? { ok: true, name: direct.name } : { ok: false, error: direct.error };
    }
    setPush(outcome);
  };

  const reset = () => { setFile(null); setResult(null); setData(null); setError(null); setPush(null); setEdited(new Set()); };

  // Live status of the pushed job, until it is filled or cancelled.
  const pushedJobId = push?.jobId;
  useEffect(() => {
    setLiveJob(null);
    if (!pushedJobId) return undefined;
    let stopped = false;
    let timer;
    const tick = async () => {
      try {
        const body = await fetch(`${JOBS_API}/${pushedJobId}`).then(r => r.json());
        if (stopped || !body.ok) return;
        setLiveJob(body.job);
        if (TERMINAL_JOB.has(body.job.status)) return;
      } catch { /* backend briefly unreachable: keep trying */ }
      if (!stopped) timer = setTimeout(tick, 3000);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, [pushedJobId]);

  // Recent jobs list on the upload screen.
  const showRecent = !data;
  useEffect(() => {
    if (!showRecent) return undefined;
    let stopped = false;
    const load = () => fetch(`${JOBS_API}?scope=recent`).then(r => r.json())
      .then(body => { if (!stopped && body.ok) setRecentJobs(body.jobs); })
      .catch(() => { if (!stopped) setRecentJobs(null); });
    load();
    const id = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(id); };
  }, [showRecent]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="hero-headline text-base text-black">MCA Document Scanner</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-lg">
              Upload the real document. Claude reads every page, you review and correct each field, then push it to the Germin8 extension for filing.
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Target e-form</p>
            <select value={formId} disabled={scanning || !!data} onChange={e => setFormId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-black font-semibold cursor-pointer disabled:opacity-60">
              {FORMS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!data && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (!scanning) scan(e.dataTransfer.files?.[0]); }}
            onClick={() => !scanning && inputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-3 bg-white transition-colors',
              scanning ? 'border-gray-200 cursor-wait' : 'cursor-pointer hover:border-black hover:bg-gray-50',
              dragging ? 'border-black bg-gray-50' : 'border-gray-200',
            )}
          >
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
              onChange={e => { scan(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              {scanning ? <RefreshCw className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
            </div>
            {scanning ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-black">Reading {file?.name}…</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{elapsed}s elapsed</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {form.id === 'AOC-4'
                    ? 'Company, balance sheet, P&L and share capital are read in parallel. A scanned 10-page PDF takes about 30–60 seconds.'
                    : 'Usually 15–40 seconds.'}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-black">Drop the {form.id} document here, or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">{form.hint}</p>
                <p className="text-[11px] text-gray-400 mt-1">PDF (scanned is fine), PNG, JPG, WEBP, TXT or CSV — up to 20 MB</p>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}
          {recentJobs && recentJobs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-black">Recent extension jobs</p>
                <p className="text-[11px] text-gray-400">Updates every few seconds</p>
              </div>
              <ul className="divide-y divide-gray-50">
                {recentJobs.slice(0, 8).map(j => {
                  const d = describeJob(j);
                  return (
                    <li key={j.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-black truncate">{j.client_name || j.client_id || j.id}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          <span className="font-mono">{EXT_FORM_LABEL[j.form_type] || j.form_type}</span> · {ageOf(j.updated_at || j.created_at)}
                          {['filling', 'needs_attention'].includes(j.status) && <> · {d.text}</>}
                        </p>
                      </div>
                      <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap', TONE[d.tone])}>{d.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3 flex-wrap">
              <FileText className="w-5 h-5 text-black mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black truncate">{companyName || file?.name}</p>
                <p className="text-[11px] text-gray-500">
                  {file?.name} · {leaves.length} fields · {result.seconds}s · {result.model}
                  {meta.sourceUnit && <> · amounts converted from “{meta.sourceUnit}” to Rupees</>}
                </p>
              </div>
              <button onClick={reset} className="text-xs font-semibold text-black hover:underline flex items-center gap-1 cursor-pointer">
                <RefreshCw className="w-3 h-3" /> Scan another
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                ['Found', counts.found, 'text-emerald-700'],
                ['Derived', counts.derived, 'text-sky-700'],
                ['Nil (0)', counts.nil, 'text-gray-500'],
                ['To check', counts.check, 'text-amber-700'],
                ['Missing', counts.missing, 'text-red-600'],
                ['Edited', counts.edited, 'text-black'],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{l}</p>
                  <p className={clsx('text-lg font-bold font-mono', c)}>{v}</p>
                </div>
              ))}
            </div>
            {(meta.notes || meta.failedParts?.length > 0) && (
              <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 space-y-1">
                {meta.notes && <p>Scanner note: {meta.notes}</p>}
                {meta.failedParts?.map(p => <p key={p} className="text-red-600">Could not read part — {p}. Fill these fields manually or rescan.</p>)}
              </div>
            )}
          </div>

          {/* Cross-checks */}
          {checks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-black mb-2">
                Cross-checks {failedChecks > 0
                  ? <span className="text-red-600 text-xs font-semibold">· {failedChecks} failing</span>
                  : <span className="text-emerald-700 text-xs font-semibold">· all passing</span>}
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {checks.map(c => (
                  <div key={c.label} className="flex items-start gap-2 text-xs">
                    {c.ok === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                    {c.ok === false && <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />}
                    {c.ok === null && <AlertTriangle className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />}
                    <span><span className="font-medium text-black">{c.label}</span> <span className="text-gray-500">— {c.detail}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-black">Review extracted data</p>
            <div className="flex rounded-full border border-gray-200 p-0.5 text-[11px] font-semibold">
              {[[false, 'All fields'], [true, `Needs review (${counts.missing + counts.check})`]].map(([v, l]) => (
                <button key={l} onClick={() => setReviewOnly(v)}
                  className={clsx('px-3 py-1 rounded-full cursor-pointer', reviewOnly === v ? 'bg-black text-white' : 'text-gray-600')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {sections.map(s => <Section key={s.key || 'root'} title={s.title} sectionKey={s.key} value={s.value} ctx={ctx} />)}
          </div>

          {/* Push */}
          <div className="sticky bottom-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] text-xs text-gray-600">
                {blocker
                  ? <span className="text-red-600 font-medium">{blocker}</span>
                  : failedChecks > 0
                    ? <span className="text-amber-700 font-medium">{failedChecks} cross-check(s) failing — review before pushing.</span>
                    : <span>{counts.edited > 0 ? `Reviewed and edited ${counts.edited} field(s).` : 'Reviewed.'} Ready for the extension.</span>}
              </div>
              <button onClick={() => downloadJson(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'meta')), `${(data.clientId || form.ext)}.json`)}
                className="py-2 px-4 rounded-full border border-gray-300 text-xs font-semibold text-black hover:bg-gray-100 cursor-pointer flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <button onClick={handlePush} disabled={!!blocker || push?.status === 'pushing'}
                className="py-2 px-5 rounded-full bg-black text-white text-xs font-semibold hover:bg-gray-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                {push?.status === 'pushing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Push to Extension
              </button>
            </div>
            {push?.status === 'done' && (
              <div className="text-[11px] space-y-0.5 border-t border-gray-100 pt-2">
                {push.jobId && <p className="text-emerald-700">Saved to the extension job queue as <span className="font-mono">{push.jobId}</span>.</p>}
                {push.queueError && <p className="text-red-600">Job queue failed: {push.queueError}</p>}
                {push.direct?.ok && <p className="text-emerald-700">Sent straight to the extension{push.direct.name ? ` as “${push.direct.name}”` : ''} — open the side panel on the MCA portal to start filling.</p>}
                {push.direct && !push.direct.ok && <p className="text-amber-700">Direct send failed: {push.direct.error}</p>}
                {!push.direct && push.jobId && <p className="text-gray-500">The extension picks this up from the queue: open its side panel → Jobs from dashboard → Load.</p>}
                {liveJob && (() => {
                  const d = describeJob(liveJob);
                  return (
                    <p className={clsx('mt-1 px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5', TONE[d.tone])}>
                      {!TERMINAL_JOB.has(liveJob.status) && liveJob.status !== 'needs_attention' && <RefreshCw className="w-3 h-3 animate-spin shrink-0" />}
                      {liveJob.status === 'filled' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                      {liveJob.status === 'needs_attention' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{d.text}</span>
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
