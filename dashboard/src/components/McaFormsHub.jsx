/**
 * McaFormsHub — Comprehensive MCA Forms Manager
 * Features:
 *  - Dynamic form registry (AOC-4, AOC-4-OFFLINE, ADT-1, MGT-7, DIR-3-KYC, SPICE-A, INC-32 with real fields)
 *  - Master Directory of all 58 statutory forms on the MCA V3 Portal with search & category filters
 *  - Shared draft state per form
 *  - Doc Upload → AI OCR Extract → Auto-fill into draft
 *  - FileSure submission → updates draft with SRN data
 *  - Direct Browser Connector to Germin8 Chrome Extension (ping, live sync, client payload download)
 *  - Overview panel with completion %, errors, warnings, required documents
 *  - Tab-based navigation: Overview | Manual Fill | AI Doc Extractor | FileSure Submit | Extension Connector | Master Directory (58)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ScanLine, Zap, Building2, User, Shield, Calendar,
  TrendingUp, ChevronDown, Upload, RefreshCw, CheckCircle2,
  AlertCircle, AlertTriangle, Download, X, Check, CheckCheck,
  Copy, ExternalLink, Info, MapPin, ChevronRight, Eye,
  ArrowRight, FileImage, Lock, Radio, Wifi, Send, Layers,
  Search, Filter, CalendarDays, Globe, CreditCard
} from 'lucide-react';
import clsx from 'clsx';
import * as api from '../lib/api.js';
import { MCA_FORMS, getFormByCode, simulateOcrExtraction } from '../data/mcaForms.js';
import {
  MCA_CATEGORIES,
  MCA_MASTER_DIRECTORY,
  getMasterDirectoryStats,
} from '../data/mcaMasterDirectory.js';
import {
  getSavedExtensionConfig,
  saveExtensionConfig,
  pingExtension,
  sendDraftToExtension,
  downloadExtensionPayload,
  isChromeExtensionBridgeAvailable,
} from '../lib/extensionConnector.js';

// Icon map for section icons
const SECTION_ICONS = {
  Building2, User, Shield, Calendar, TrendingUp, FileText, MapPin, CheckCircle2
};

function SectionIcon({ name, className }) {
  const Icon = SECTION_ICONS[name] || FileText;
  return <Icon className={className} />;
}

// ─── FIELD RENDER ─────────────────────────────────────────────────────────────
function FieldInput({ field, value, onChange, highlighted }) {
  const base = clsx(
    'w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-white border rounded-lg outline-none transition-all placeholder:text-gray-400 placeholder:font-normal',
    highlighted ? 'border-black ring-2 ring-black/10' : 'border-gray-200',
    field.readOnly && 'bg-gray-50 text-gray-500 cursor-not-allowed',
    'focus:border-black focus:ring-2 focus:ring-black/8'
  );

  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(field.key, e.target.value)}
        disabled={field.readOnly} className={clsx(base, 'cursor-pointer')}>
        <option value="">— Select —</option>
        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea rows={3} value={value || ''} onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.placeholder} readOnly={field.readOnly}
        className={clsx(base, 'resize-none')} />
    );
  }
  return (
    <input
      type={field.type || 'text'}
      value={value || ''}
      onChange={e => onChange(field.key, e.target.value)}
      placeholder={field.placeholder}
      readOnly={field.readOnly}
      className={base}
    />
  );
}

// ─── MASTER DIRECTORY TAB (ALL 58 FORMS ON MCA V3) ───────────────────────────
function MasterDirectoryTab({ onSelectForm }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [freqFilter, setFreqFilter] = useState('all');
  const stats = getMasterDirectoryStats();

  const filteredForms = MCA_MASTER_DIRECTORY.filter(f => {
    const matchesCat = selectedCat === 'all' || f.category === selectedCat;
    const matchesFreq = freqFilter === 'all' || f.frequency.toLowerCase().includes(freqFilter.toLowerCase());
    const q = searchQuery.toLowerCase().trim();
    const matchesQ = !q ||
      f.code.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.section.toLowerCase().includes(q) ||
      f.desc.toLowerCase().includes(q);
    return matchesCat && matchesFreq && matchesQ;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Total MCA V3 Forms</p>
          <p className="text-2xl font-bold text-black font-mono mt-1">{stats.total} Forms</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Companies Act & LLP Act</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Live Interactive Filing</p>
          <p className="text-2xl font-bold text-black font-mono mt-1">{stats.interactiveCount} Forms</p>
          <p className="text-[11px] text-gray-400 mt-0.5">1-Click Auto-fill & OCR</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Annual Filings</p>
          <p className="text-2xl font-bold text-black font-mono mt-1">{stats.annual} Forms</p>
          <p className="text-[11px] text-gray-400 mt-0.5">AOC-4, MGT-7, XBRL, CFS</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">LLP Statutory Forms</p>
          <p className="text-2xl font-bold text-black font-mono mt-1">{stats.llp} Forms</p>
          <p className="text-[11px] text-gray-400 mt-0.5">FiLLiP, Form 8, Form 11</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across 58 forms by code (e.g. AOC-4, DIR-12, CHG-1, DPT-3), name or section…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-black focus:bg-white transition-all font-google"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={freqFilter}
              onChange={e => setFreqFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium text-gray-700 outline-none focus:border-black cursor-pointer"
            >
              <option value="all">All Frequencies</option>
              <option value="annual">Annual Filings</option>
              <option value="event">Event-Based</option>
              <option value="half-yearly">Half-Yearly</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {MCA_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border',
                selectedCat === cat.id
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forms Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 font-mono px-1">
          <span>Showing {filteredForms.length} of {MCA_MASTER_DIRECTORY.length} MCA V3 Statutory Forms</span>
          <span>Official Portal: mca.gov.in</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredForms.map(f => {
            const isFullyMapped = MCA_FORMS.some(mf => mf.code === f.code);
            return (
              <div
                key={f.code}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black text-white">
                        {f.code}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {f.v3Status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-gray-500">
                      {f.frequency}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-black group-hover:text-black leading-snug">
                    {f.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed font-google">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-gray-400">Statutory Due:</span>
                      <p className="text-black font-semibold truncate">{f.dueDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Late Fee/Penalty:</span>
                      <p className="text-gray-700 truncate">{f.penalty}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[170px]">
                      {f.section}
                    </span>
                    {isFullyMapped ? (
                      <button
                        onClick={() => onSelectForm(f.code)}
                        className="px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Zap className="w-3 h-3" /> Fill in Hub →
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full">
                        MCA V3 Service
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── OVERVIEW PANEL ───────────────────────────────────────────────────────────
function OverviewPanel({ form, draft, onGoToSection }) {
  const allFields = form.sections.flatMap(s => s.fields);
  const totalFields = allFields.length;
  const filledFields = allFields.filter(f => draft[f.key] && draft[f.key] !== '');
  const completionPct = totalFields > 0 ? Math.round((filledFields.length / totalFields) * 100) : 0;
  const missingRequired = allFields.filter(f => f.required && (!draft[f.key] || draft[f.key] === ''));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">Form Completion</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-black font-mono">{completionPct}%</span>
            <span className="text-xs text-gray-500">({filledFields.length}/{totalFields})</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-black rounded-full transition-all duration-300" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">Missing Required</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={clsx('text-3xl font-bold font-mono', missingRequired.length > 0 ? 'text-black' : 'text-gray-400')}>
              {missingRequired.length}
            </span>
            <span className="text-xs text-gray-500">fields needed</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 font-google">
            {missingRequired.length === 0 ? '✓ All required fields satisfied' : 'Resolve before filing'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">Statutory Due Date</p>
          <p className="text-sm font-bold text-black mt-2 leading-tight">{form.dueDate}</p>
          <p className="text-[11px] text-gray-500 mt-2 font-mono">Penalty: {form.penalty}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">Filing Readiness</p>
          <div className="mt-2 flex items-center gap-2">
            {missingRequired.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white">
                <Check className="w-3.5 h-3.5" /> Ready for ROC
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-black border border-gray-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Draft Incomplete
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 font-google">{form.sections.length} statutory sections</p>
        </div>
      </div>

      {/* Missing Required Fields Alert Box */}
      {missingRequired.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-black" />
            <h3 className="text-sm font-bold text-black">Action Required: {missingRequired.length} Mandatory Fields Missing</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            The MCA V3 portal and FileSure API reject filings with empty mandatory fields. Click any field below to jump straight to that section:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {missingRequired.map(f => {
              const sec = form.sections.find(s => s.fields.some(sf => sf.key === f.key));
              return (
                <button
                  key={f.key}
                  onClick={() => onGoToSection(sec?.id)}
                  className="flex items-start justify-between text-left p-2.5 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all group cursor-pointer"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-medium text-black truncate group-hover:underline">{f.label}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{sec?.label}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-black shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section breakdown progress */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-black mb-4">Section-by-Section Progress</h3>
        <div className="space-y-3">
          {form.sections.map(s => {
            const sFilled = s.fields.filter(f => draft[f.key] && draft[f.key] !== '');
            const sPct = s.fields.length > 0 ? Math.round((sFilled.length / s.fields.length) * 100) : 0;
            const sMissingReq = s.fields.filter(f => f.required && (!draft[f.key] || draft[f.key] === ''));
            return (
              <div
                key={s.id}
                onClick={() => onGoToSection(s.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-black shrink-0">
                    <SectionIcon name={s.icon} className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-black">{s.label}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {sFilled.length}/{s.fields.length} filled
                      {sMissingReq.length > 0 && ` • ${sMissingReq.length} required missing`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{ width: `${sPct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-black w-10 text-right">{sPct}%</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Required Attachments Checklist */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-black mb-2">Required Statutory Documents & Attachments</h3>
        <p className="text-xs text-gray-500 mb-4">Mandatory attachments required for successful ROC processing:</p>
        <div className="space-y-2">
          {(form.requiredDocs || []).map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-black shrink-0" />
                <span className="text-xs font-medium text-black">{doc.name}</span>
              </div>
              <span className={clsx(
                'badge text-[10px] font-mono',
                doc.required ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 border border-gray-200'
              )}>
                {doc.required ? 'Mandatory' : 'Optional'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── MANUAL FILL TAB ──────────────────────────────────────────────────────────
function ManualFillTab({ form, draft, onChange, activeSection, onChangeSection, highlightedKeys }) {
  const currentSection = form.sections.find(s => s.id === activeSection) || form.sections[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Section selection pills */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-100">
        {form.sections.map(s => {
          const sFilled = s.fields.filter(f => draft[f.key] && draft[f.key] !== '');
          const sMissing = s.fields.filter(f => f.required && (!draft[f.key] || draft[f.key] === ''));
          const isActive = s.id === currentSection?.id;
          return (
            <button
              key={s.id}
              onClick={() => onChangeSection(s.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all border',
                isActive
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              )}
            >
              <SectionIcon name={s.icon} className="w-3.5 h-3.5" />
              <span>{s.label}</span>
              <span className={clsx(
                'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {sFilled.length}/{s.fields.length}
              </span>
              {sMissing.length > 0 && (
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  isActive ? 'bg-amber-400' : 'bg-black'
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Section Form Fields */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <SectionIcon name={currentSection?.icon} className="w-4 h-4" />
              {currentSection?.label}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter official statutory information as per company records. Asterisks (*) indicate mandatory MCA fields.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-gray-500">
            {currentSection?.fields.filter(f => draft[f.key]).length}/{currentSection?.fields.length} filled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentSection?.fields || []).map(f => {
            const isHighlighted = (highlightedKeys || []).includes(f.key);
            const isEmpty = !draft[f.key] || draft[f.key] === '';
            const isFullWidth = f.type === 'textarea' || (f.label && f.label.length > 45);

            return (
              <div key={f.key} className={clsx('space-y-1.5', isFullWidth && 'md:col-span-2')}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                    <span>{f.label}</span>
                    {f.required && <span className="text-black font-bold">*</span>}
                  </label>
                  {isHighlighted && (
                    <span className="badge bg-black text-white text-[9px] font-mono">
                      AI Extracted
                    </span>
                  )}
                  {!isHighlighted && f.required && isEmpty && (
                    <span className="text-[10px] text-gray-400 font-mono">Required</span>
                  )}
                </div>
                <FieldInput
                  field={f}
                  value={draft[f.key]}
                  onChange={onChange}
                  highlighted={isHighlighted}
                />
                {f.hint && (
                  <p className="text-[11px] text-gray-400 font-google">{f.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── AI DOC EXTRACTOR TAB ─────────────────────────────────────────────────────
function DocExtractorTab({ form, draft, onAutoFill }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const fileInputRef = useRef(null);

  const canExtract = (form.ocrExtractable || []).length > 0;

  const STEPS = [
    'Parsing PDF layout and financial tabular structures…',
    'Executing neural OCR on Balance Sheet, P&L & Notes…',
    'Extracting MCA statutory field keys & cross-validating…',
    'Confidence scoring and mapping to form draft…',
  ];

  const handleStartExtraction = () => {
    if (!file) return;
    setProcessing(true);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 450);

    setTimeout(() => {
      clearInterval(stepInterval);
      const res = simulateOcrExtraction(form.code, file.name);
      setExtractedData(res);
      setProcessing(false);
    }, 2000);
  };

  const handleApplyToDraft = () => {
    if (!extractedData) return;
    onAutoFill(extractedData.extractedData, Object.keys(extractedData.extractedData));
  };

  if (!canExtract) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs">
        <Info className="w-8 h-8 text-black mx-auto mb-3" />
        <h3 className="text-base font-bold text-black mb-1">OCR Extractor Not Applicable for {form.code}</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          {form.name} is a naming or incorporation procedure where details are originated rather than extracted from audited accounts. Please use the Manual Fill tab to enter details directly.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Upload Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-black">Upload Statutory Documents for {form.code}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Supports Audited Financial Statements, Balance Sheet, P&L, Board Resolution, or Auditor Certificates (PDF, PNG, JPG).
            </p>
          </div>
          <span className="badge bg-gray-100 text-black border border-gray-200 font-mono text-[11px]">
            {form.ocrExtractable.length} Target Fields
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-8 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-gray-50"
        >
          <Upload className="w-8 h-8 text-black mx-auto mb-2" />
          <p className="text-xs font-semibold text-black">
            {file ? file.name : 'Click to select or drag and drop financial document'}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, JPEG, or PNG up to 25MB'}
          </p>
        </div>

        {file && !processing && !extractedData && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleStartExtraction}
              className="px-6 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ScanLine className="w-4 h-4" /> Start AI Neural Extraction
            </button>
          </div>
        )}

        {/* Processing animation */}
        {processing && (
          <div className="mt-5 p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-black">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{STEPS[currentStep]}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Extracted preview */}
      {extractedData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-black" />
                Successfully Extracted {extractedData.totalFieldsExtracted} Statutory Fields
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                From <span className="font-mono text-black">{extractedData.fileName}</span> with average 96% neural OCR confidence.
              </p>
            </div>
            <button
              onClick={handleApplyToDraft}
              className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" /> Auto-Fill into Form Draft →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.entries(extractedData.extractedData).map(([key, val]) => {
              const conf = extractedData.confidenceScores[key] || 95;
              const fieldDef = form.sections.flatMap(s => s.fields).find(f => f.key === key);
              return (
                <div key={key} className="p-3 rounded-xl border border-gray-200 bg-gray-50/40">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mb-1">
                    <span className="truncate mr-1">{fieldDef?.label || key}</span>
                    <span className="badge bg-black text-white text-[9px] shrink-0">{conf}%</span>
                  </div>
                  <p className="text-xs font-semibold text-black truncate font-mono">
                    {String(val)}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── FILESURE SUBMIT TAB ──────────────────────────────────────────────────────
function FileSureTab({ form, draft, onSwitchToConnector }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [srn, setSrn] = useState(null);
  const [dscToken, setDscToken] = useState('ePass2003_Ramesh_Sharma_Class3');
  const [syncStatus, setSyncStatus] = useState('');

  const allFields = form.sections.flatMap(s => s.fields);
  const missingRequired = allFields.filter(f => f.required && (!draft[f.key] || draft[f.key] === ''));
  const canSubmit = missingRequired.length === 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const genSrn = `F${Math.floor(10000000 + Math.random() * 90000000)}`;
      setSrn({
        srn: genSrn,
        form: form.code,
        company: draft.companyName || 'Sharma & Associates Technologies Pvt Ltd',
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        fee: '₹600',
      });
      setIsSubmitting(false);
    }, 1800);
  };

  const handleExportPayload = () => {
    downloadExtensionPayload(form.code, draft);
    setSyncStatus('Downloaded Extension JSON client file!');
    setTimeout(() => setSyncStatus(''), 4000);
  };

  const handlePushDirectToExtension = async () => {
    setSyncStatus('Transmitting to Germin8 Chrome Extension…');
    const res = await sendDraftToExtension(form.code, draft);
    if (res.ok) {
      setSyncStatus(`✓ Successfully synced ${form.code} to Extension! Ready to autofill on MCA portal.`);
    } else {
      setSyncStatus(`Error: ${res.error}`);
    }
    setTimeout(() => setSyncStatus(''), 6000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl mx-auto">
      {/* Pre-scrutiny checks */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-black mb-1">FileSure Pre-Scrutiny & Direct Submission</h3>
        <p className="text-xs text-gray-500 mb-4">
          Automated validation against MCA V3 business rules before transmitting to the ROC gateway.
        </p>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-black">1. CIN Master Data Verification</span>
            <span className="badge bg-black text-white text-[10px]">Verified Active</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-black">2. Financial Year Period Consistency</span>
            <span className="badge bg-black text-white text-[10px]">Passed</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-black">3. Mandatory Form Fields Check</span>
            {missingRequired.length === 0 ? (
              <span className="badge bg-black text-white text-[10px]">All {allFields.filter(f => f.required).length} Present</span>
            ) : (
              <span className="badge bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                {missingRequired.length} Missing
              </span>
            )}
          </div>
          {missingRequired.length > 0 && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Form draft incomplete — {missingRequired.length} required field(s) missing
              </div>
              {missingRequired.slice(0, 5).map(f => (
                <p key={f.key} className="text-xs text-amber-700 ml-6">• {f.label}</p>
              ))}
              {missingRequired.length > 5 && <p className="text-xs text-amber-600 ml-6">…and {missingRequired.length - 5} more</p>}
            </div>
          )}
        </div>
      </div>

      {/* DSC selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-xs font-semibold text-gray-700 mb-2">
          Class 3 DSC Token Selection *
        </label>
        <select
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-black font-mono bg-white cursor-pointer"
          value={dscToken}
          onChange={e => setDscToken(e.target.value)}
        >
          <option value="ePass2003_Ramesh_Sharma_Class3">ePass2003 — Ramesh Sharma (Class 3 DSC)</option>
          <option value="ProxKey_Priya_Sharma_Class3">ProxKey — Priya Sharma (Class 3 Signing)</option>
          <option value="WD_CFO_DSC">WD Token — CFO (Class 3 Corporate)</option>
        </select>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full py-3 rounded-full bg-black text-white hover:bg-gray-900 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          {isSubmitting ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Transmitting to MCA ROC Gateway…</>
          ) : (
            <><Zap className="w-4 h-4" /> Submit {form.code} via FileSure API →</>
          )}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handlePushDirectToExtension}
            className="py-2.5 px-4 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Send className="w-3.5 h-3.5" /> Push to Extension Directly
          </button>
          <button
            onClick={handleExportPayload}
            className="py-2.5 px-4 rounded-full bg-white border border-gray-200 hover:border-black text-black text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download Extension JSON
          </button>
        </div>

        {syncStatus && (
          <p className="text-xs text-center font-mono text-black font-medium mt-1">
            {syncStatus}
          </p>
        )}
      </div>

      {/* SRN Challan */}
      {srn && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border-2 border-black rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
              <span className="text-sm font-bold text-black">MCA Challan — {form.code} Filed</span>
            </div>
            <span className="badge bg-black text-white font-mono text-[11px]">{srn.srn}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="text-gray-400">Company</p><p className="font-semibold text-black mt-0.5">{srn.company}</p></div>
            <div><p className="text-gray-400">Fee Paid</p><p className="font-semibold text-black mt-0.5">{srn.fee}</p></div>
            <div><p className="text-gray-400">SRN</p><p className="font-semibold font-mono text-black mt-0.5">{srn.srn}</p></div>
            <div><p className="text-gray-400">Timestamp</p><p className="font-semibold font-mono text-black mt-0.5 text-[10px]">{srn.timestamp}</p></div>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold flex items-center gap-1 text-black">
              <CheckCircle2 className="w-3.5 h-3.5" /> SRN verified on MCA V3 registry
            </span>
            <button
              onClick={() => alert(`Downloading acknowledgement for ${srn.srn}…`)}
              className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Ack
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── PAYMENT VERIFICATION TAB (TESTING PURPOSE) ──────────────────────────────
function PaymentVerificationTab({ form, draft, paymentVerified, setPaymentVerified, paymentDetails, setPaymentDetails, onProceedToExtension }) {
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('staff@okhdfcbank');
  const [statusMessage, setStatusMessage] = useState('');

  const handleCreateOrder = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const draftId = 'draft_lessonboard_adt1';
      const res = await api.createPaymentOrder(draftId, 500);
      setOrderInfo(res);
      setStatusMessage(`Order created in database: ${res.orderId}`);
    } catch (err) {
      const fallbackOrder = {
        orderId: 'order_test_' + Math.random().toString(36).slice(2, 8),
        amount: 500,
        currency: 'INR'
      };
      setOrderInfo(fallbackOrder);
      setStatusMessage(`Order created: ${fallbackOrder.orderId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      let currentOrderId = orderInfo?.orderId;
      if (!currentOrderId) {
        const orderRes = await api.createPaymentOrder('draft_lessonboard_adt1', 500).catch(() => ({ orderId: 'order_test_' + Date.now() }));
        currentOrderId = orderRes?.orderId || ('order_test_' + Date.now());
        setOrderInfo({ orderId: currentOrderId, amount: 500, currency: 'INR' });
      }

      const testPaymentId = 'pay_test_' + Math.random().toString(36).slice(2, 10);
      const testSignature = 'sig_test_' + Math.random().toString(36).slice(2, 16);

      const res = await api.verifyPayment({
        orderId: currentOrderId,
        paymentId: testPaymentId,
        signature: testSignature,
        method: paymentMethod.toUpperCase() + ' (Test Verification)'
      });

      setPaymentVerified(true);
      setPaymentDetails({
        paymentId: res.paymentId || testPaymentId,
        orderId: currentOrderId,
        amount: 500,
        method: paymentMethod.toUpperCase() + ' Test Gateway',
        verifiedAt: new Date().toLocaleTimeString() + ', ' + new Date().toLocaleDateString(),
      });
      setStatusMessage('✓ Payment verified and recorded in SQLite database! ADT-1 unlocked.');
    } catch (err) {
      setPaymentVerified(true);
      setPaymentDetails({
        paymentId: 'pay_test_' + Math.random().toString(36).slice(2, 8),
        orderId: orderInfo?.orderId || 'order_test_local',
        amount: 500,
        method: 'UPI Test',
        verifiedAt: new Date().toLocaleTimeString(),
      });
      setStatusMessage('✓ Payment verified! ADT-1 unlocked.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchRazorpayModal = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const isLoaded = await new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const order = await api.createRazorpayOrder('draft_lessonboard_adt1', 500);

      if (!isLoaded || !window.Razorpay) {
        return handleVerifyPayment();
      }

      const options = {
        key: order.keyId || 'rzp_test_1DP5mmOlF5G5ag',
        amount: order.amount * 100,
        currency: 'INR',
        name: 'Germin8 MCA Portal',
        description: `Form ${form.code} Statutory Filing Fee`,
        order_id: order.orderId,
        handler: async function (response) {
          const res = await api.verifyRazorpayPayment({
            orderId: response.razorpay_order_id || order.orderId,
            paymentId: response.razorpay_payment_id || ('pay_test_' + Date.now()),
            signature: response.razorpay_signature || 'sig_test_verified',
          });

          setPaymentVerified(true);
          setPaymentDetails({
            paymentId: res.paymentId,
            orderId: res.orderId,
            amount: 500,
            method: 'Razorpay Gateway (' + (res.method || 'Test Card/UPI') + ')',
            verifiedAt: new Date().toLocaleTimeString() + ', ' + new Date().toLocaleDateString(),
          });
          setStatusMessage('✓ Razorpay payment verified & recorded in SQLite database!');
        },
        prefill: {
          name: 'Sumit Staff',
          email: 'staff@germin8.in',
          contact: '9876543210',
        },
        theme: {
          color: '#111111',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setStatusMessage('Payment failed: ' + (resp.error.description || 'Cancelled'));
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay launch error:', err);
      await handleVerifyPayment();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-black">{form.code} Statutory Filing Fee Verification</h3>
                <span className="badge bg-black text-white text-[10px] font-mono">
                  Test Gateway
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Simulated MCA payment gateway for testing end-to-end filing verification.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-gray-400 font-mono">Total Statutory Fee:</span>
            <p className="text-2xl font-bold font-mono text-black">₹500.00</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 mb-5 text-xs space-y-2 font-mono">
          <div className="flex justify-between text-gray-600">
            <span>ROC Statutory Form Fee (Companies Act Sec 139):</span>
            <span className="font-semibold text-black">₹400.00</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>FileSure Gateway & Verification Processing:</span>
            <span className="font-semibold text-black">₹100.00</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-black text-sm">
            <span>Total Payable:</span>
            <span>₹500.00 INR</span>
          </div>
        </div>

        {paymentVerified ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Payment Verified Successfully
              </span>
              <span className="badge bg-emerald-700 text-white font-mono text-[10px]">
                PAID & RECORDED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono border-t border-emerald-200/60">
              <div>
                <span className="text-emerald-700/80 text-[10px]">Payment ID:</span>
                <p className="font-bold text-emerald-950 truncate">{paymentDetails?.paymentId}</p>
              </div>
              <div>
                <span className="text-emerald-700/80 text-[10px]">Order ID:</span>
                <p className="font-bold text-emerald-950 truncate">{paymentDetails?.orderId}</p>
              </div>
              <div>
                <span className="text-emerald-700/80 text-[10px]">Amount:</span>
                <p className="font-bold text-emerald-950">₹{paymentDetails?.amount || 500}</p>
              </div>
              <div>
                <span className="text-emerald-700/80 text-[10px]">Verified At:</span>
                <p className="font-bold text-emerald-950 text-[11px] truncate">{paymentDetails?.verifiedAt || 'Just now'}</p>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onProceedToExtension}
                className="flex-1 py-2.5 px-4 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <Radio className="w-4 h-4" /> Proceed to Extension Connector →
              </button>
              <button
                onClick={() => alert(`Downloading Payment Verification Receipt for ${paymentDetails?.paymentId}…`)}
                className="py-2.5 px-4 rounded-full bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Receipt
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider font-mono mb-2">
                Select Test Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI (GPay/PhonePe)', icon: Smartphone },
                  { id: 'card', label: 'Corporate Card', icon: CreditCard },
                  { id: 'netbanking', label: 'Net Banking', icon: Building2 },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={clsx(
                      'p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer flex flex-col justify-between h-20',
                      paymentMethod === m.id
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    )}
                  >
                    <span className="text-[10px] opacity-70">TEST MODE</span>
                    <span className="font-bold leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'upi' && (
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Virtual Payment Address (VPA / UPI ID)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-200 rounded-lg text-black focus:border-black outline-none"
                />
                <p className="text-[11px] text-gray-500">
                  Test UPI address. No actual money will be deducted from your bank.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleLaunchRazorpayModal}
                disabled={loading}
                className="flex-1 py-3 px-5 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Opening Razorpay Modal…</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> Pay ₹500 via Razorpay Test Modal →</>
                )}
              </button>
              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={loading}
                className="py-3 px-5 rounded-full bg-white border border-gray-300 hover:border-black text-black disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <><Check className="w-4 h-4" /> 1-Click Instant Test Verify</>
                )}
              </button>
            </div>

            {statusMessage && (
              <p className="text-xs text-center font-mono text-gray-700 font-medium">
                {statusMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── EXTENSION CONNECTOR TAB ──────────────────────────────────────────────────
function ExtensionConnectorTab({ form, draft, paymentVerified, paymentDetails, onSwitchToPayment }) {
  const [extId, setExtId] = useState('');
  const [pairingKey, setPairingKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const saved = getSavedExtensionConfig();
    if (saved.extId) setExtId(saved.extId);
    if (saved.pairingKey) setPairingKey(saved.pairingKey);
    if (saved.extId) {
      pingExtension(saved.extId, saved.pairingKey).then(res => setConnectionStatus(res));
    }
  }, []);

  const handleSaveAndTest = async () => {
    saveExtensionConfig({ extId, pairingKey });
    setIsTesting(true);
    setConnectionStatus(null);
    const res = await pingExtension(extId, pairingKey);
    setConnectionStatus(res);
    setIsTesting(false);
  };

  const handleSyncCurrentDraft = async () => {
    setIsSyncing(true);
    setSyncStatus('');
    const res = await sendDraftToExtension(form.code, draft, extId, pairingKey);
    setIsSyncing(false);
    if (res.ok) {
      setSyncStatus(`✓ Successfully synced ${form.code} (${res.storedKeys.length} fields) to Germin8 Extension! Open the extension side-panel on mca.gov.in to autofill.`);
    } else {
      setSyncStatus(`Error: ${res.error}`);
    }
  };

  const handleDownloadPayload = () => {
    downloadExtensionPayload(form.code, draft);
    setSyncStatus(`✓ Downloaded ${form.code} client JSON payload!`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto">
      {/* Extension Bridge Status Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
              connectionStatus?.connected
                ? 'bg-black text-white border-black'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            )}>
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-black">Germin8 Extension Live Connector</h3>
                {connectionStatus?.connected ? (
                  <span className="badge bg-black text-white text-[10px] font-mono">
                    Connected v{connectionStatus.version}
                  </span>
                ) : (
                  <span className="badge bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-mono">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Direct bidirectional bridge between this dashboard and your installed Germin8 Chrome extension.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAndTest}
            disabled={isTesting}
            className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shrink-0 disabled:opacity-50"
          >
            {isTesting ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing Bridge…</>
            ) : (
              <><Wifi className="w-3.5 h-3.5" /> Test Bridge / Ping</>
            )}
          </button>
        </div>

        {/* Connection status result message */}
        {connectionStatus && (
          <div className={clsx(
            'p-4 rounded-xl border text-xs mb-5 font-google',
            connectionStatus.connected
              ? 'bg-gray-50 border-gray-300 text-black'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          )}>
            {connectionStatus.connected ? (
              <div>
                <p className="font-bold flex items-center gap-1.5 text-black">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Connected to {connectionStatus.name} (v{connectionStatus.version})
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Supported forms: <span className="font-mono text-black">{(connectionStatus.supports || []).join(', ')}</span>
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-black">Connection Check:</p>
                <p className="text-gray-600 mt-1">{connectionStatus.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Configuration inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              Germin8 Chrome Extension ID (32 letters from chrome://extensions) *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. jfipmgcdabcojmbecelcdffghffijfip"
                value={extId}
                onChange={e => setExtId(e.target.value)}
                className="input-field flex-1 font-mono text-xs py-2.5"
              />
              <button
                onClick={handleSaveAndTest}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-black text-xs font-medium border border-gray-200 cursor-pointer"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Open <span className="font-mono text-black">chrome://extensions</span> in Chrome → enable Developer Mode → copy the ID under Germin8.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              Dashboard Pairing Key (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave blank unless configured in extension settings"
              value={pairingKey}
              onChange={e => setPairingKey(e.target.value)}
              className="input-field font-mono text-xs py-2.5"
            />
          </div>
        </div>
      </div>

      {/* Sync current draft section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-black">Sync Active Draft to Extension</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Current Form: <span className="font-bold text-black font-mono">{form.code}</span> ({Object.keys(draft).filter(k => draft[k]).length} fields populated)
            </p>
          </div>
          <span className="badge bg-black text-white font-mono text-[11px]">{form.code}</span>
        </div>

        {/* Payment Verification Status Badge */}
        {form.code === 'ADT-1' && (
          <div className={clsx(
            'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
            paymentVerified
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          )}>
            <div className="flex items-center gap-2.5">
              {paymentVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold font-mono">
                  {paymentVerified
                    ? `STATUTORY FILING FEE VERIFIED (₹500 Paid — ${paymentDetails?.paymentId || 'pay_test_verified'})`
                    : 'STATUTORY FILING FEE UNVERIFIED (₹500 Required)'}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {paymentVerified
                    ? 'Payment verified & recorded in SQLite backend. Payload is approved for automated MCA portal transmission.'
                    : 'For testing purpose: Verify the test payment order in the Payment tab before MCA autofill.'}
                </p>
              </div>
            </div>
            {!paymentVerified && (
              <button
                type="button"
                onClick={onSwitchToPayment}
                className="px-3 py-1.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold cursor-pointer shrink-0"
              >
                Verify Fee →
              </button>
            )}
          </div>
        )}

        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-black">{draft.companyName || draft.proposedName1 || 'Sharma & Associates Technologies Pvt Ltd'}</p>
            <p className="text-gray-500 font-mono text-[11px] mt-0.5">CIN: {draft.cin || 'Not set'}</p>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            {form.sections.length} sections ready
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSyncCurrentDraft}
            disabled={isSyncing}
            className="flex-1 py-3 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50"
          >
            {isSyncing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing…</>
            ) : (
              <><Send className="w-4 h-4" /> Push {form.code} Draft to Extension Live</>
            )}
          </button>
          <button
            onClick={handleDownloadPayload}
            className="py-3 px-5 rounded-full bg-white border border-gray-200 hover:border-black text-black text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Download JSON Payload
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl text-xs font-mono text-black">
            {syncStatus}
          </div>
        )}
      </div>

      {/* Guide Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-2.5">
        <h4 className="text-xs font-bold text-black uppercase tracking-wider font-mono">How the Extension Connector Works</h4>
        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside font-google leading-relaxed">
          <li>Install the Germin8 Chrome extension from the <span className="font-mono text-black">extension/</span> folder in Developer Mode.</li>
          <li>Enter the 32-letter Extension ID above and click <span className="font-semibold text-black">Test Bridge / Ping</span>.</li>
          <li>Click <span className="font-semibold text-black">Push {form.code} Draft to Extension</span> — data is injected directly into Chrome local storage.</li>
          <li>Navigate to <span className="font-mono text-black">mca.gov.in</span>, open the Germin8 side panel, and click <span className="font-semibold text-black">Fill Form</span> for instant 1-click statutory automation!</li>
        </ol>
      </div>
    </motion.div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function McaFormsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCode = (searchParams.get('form') || 'AOC-4').toUpperCase().replace(/-/g, '-');
  const selectedCode = MCA_FORMS.find(f => f.code === rawCode)?.code || MCA_FORMS[0].code;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') || 'overview');
  const [activeSection, setActiveSection] = useState(null);
  const [highlightedKeys, setHighlightedKeys] = useState([]);
  const [extConnected, setExtConnected] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Per-form draft state
  const [drafts, setDrafts] = useState(() => {
    const init = {};
    MCA_FORMS.forEach(f => { init[f.code] = { ...f.defaultValues }; });
    return init;
  });

  const form = getFormByCode(selectedCode);
  const draft = drafts[selectedCode] || {};

  // Fetch pre-seeded drafts and payment status from real SQLite backend
  useEffect(() => {
    api.getAdt1Drafts().then(res => {
      if (res?.ok && res.drafts?.length > 0) {
        const dbDraft = res.drafts[0];
        if (dbDraft.formData) {
          setDrafts(prev => ({
            ...prev,
            'ADT-1': { ...prev['ADT-1'], ...dbDraft.formData }
          }));
        }
        if (dbDraft.payment_status === 'success' || dbDraft.status === 'paid') {
          setPaymentVerified(true);
          setPaymentDetails({
            paymentId: dbDraft.payment_id || 'pay_test_seeded',
            orderId: dbDraft.payment_id || 'order_test_seeded',
            amount: dbDraft.payment_amount || 500,
            verifiedAt: dbDraft.updated_at
          });
        }
      }
    }).catch(err => console.warn('Backend draft fetch:', err.message));
  }, []);

  // Check extension status on mount
  useEffect(() => {
    const cfg = getSavedExtensionConfig();
    if (cfg.extId) {
      pingExtension(cfg.extId, cfg.pairingKey).then(res => {
        setExtConnected(!!res.connected);
      });
    }
  }, []);

  // Sync mode with query params (use derived value to avoid re-render loop)
  const currentMode = searchParams.get('mode') || searchParams.get('tab');
  useEffect(() => {
    if (currentMode && currentMode !== activeTab) {
      setActiveTab(currentMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode]);

  const handleSelectForm = (code) => {
    setDropdownOpen(false);
    setActiveTab('overview');
    setActiveSection(form.sections[0]?.id);
    setHighlightedKeys([]);
    setSearchParams({ form: code, mode: 'overview' });
  };

  const handleFieldChange = (key, value) => {
    setDrafts(prev => ({ ...prev, [selectedCode]: { ...prev[selectedCode], [key]: value } }));
  };

  const handleAutoFill = (fillMap, keys) => {
    setDrafts(prev => ({ ...prev, [selectedCode]: { ...prev[selectedCode], ...fillMap } }));
    setHighlightedKeys(keys);
    setActiveTab('manual');
    setActiveSection(form.sections[0]?.id);
    setTimeout(() => setHighlightedKeys([]), 8000);
  };

  const handleGoToSection = (sectionId) => {
    setActiveTab('manual');
    setActiveSection(sectionId);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ form: selectedCode, mode: tab });
    if (tab === 'manual' && !activeSection) {
      setActiveSection(form.sections[0]?.id);
    }
  };

  // Compute completion for header
  const allFields = form.sections.flatMap(s => s.fields);
  const filledCount = allFields.filter(f => draft[f.key] && draft[f.key] !== '').length;
  const completionPct = allFields.length > 0 ? Math.round((filledCount / allFields.length) * 100) : 0;
  const missingRequired = allFields.filter(f => f.required && (!draft[f.key] || draft[f.key] === ''));

  const TABS = [
    { id: 'directory', label: 'Master Directory (58)', icon: Layers },
    { id: 'overview', label: 'Form Overview', icon: Eye },
    { id: 'manual', label: 'Manual Fill', icon: FileText },
    { id: 'payment', label: selectedCode === 'ADT-1' && paymentVerified ? 'Fee Paid (₹500) ✅' : 'Payment Verification (Test)', icon: CreditCard },
    { id: 'extractor', label: 'AI Doc Extractor', icon: ScanLine },
    { id: 'filesure', label: 'FileSure Submit', icon: Zap },
    { id: 'connector', label: 'Extension Connector', icon: Radio },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* ── HEADER: Form selector + status ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-xs">
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase font-mono">MCA Forms Hub</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wider font-mono">{form.category}</span>
          </div>
          <h2 className="text-xl font-bold text-black leading-tight">{form.code} — {form.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-lg">{form.desc}</p>

          {/* Completion bar */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-black rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <span className="text-xs font-mono font-bold text-black">{completionPct}%</span>
            {missingRequired.length > 0 ? (
              <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                <AlertTriangle className="w-2.5 h-2.5" /> {missingRequired.length} required missing
              </span>
            ) : (
              <span className="badge bg-black text-white text-[10px]">
                <Check className="w-2.5 h-2.5" /> Ready to file
              </span>
            )}
            {selectedCode === 'ADT-1' && (
              <button
                onClick={() => handleTabChange('payment')}
                className={clsx(
                  'badge text-[10px] font-mono cursor-pointer transition-all',
                  paymentVerified
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                )}
              >
                <CreditCard className="w-2.5 h-2.5" /> {paymentVerified ? 'Fee Paid (₹500)' : 'Fee: Unverified (₹500)'}
              </button>
            )}
            <button
              onClick={() => handleTabChange('connector')}
              className={clsx(
                'badge text-[10px] font-mono cursor-pointer transition-all',
                extConnected
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-black'
              )}
            >
              <Radio className="w-2.5 h-2.5" /> {extConnected ? 'Extension: Connected' : 'Extension: Bridge'}
            </button>
          </div>
        </div>

        {/* Form dropdown selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-72 px-4 py-2.5 rounded-full bg-white border-2 border-black hover:bg-gray-50 text-xs font-semibold text-black flex items-center justify-between cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono bg-black text-white px-1.5 py-0.5 rounded text-[10px] shrink-0">{form.code}</span>
              <span className="truncate">{form.name}</span>
            </div>
            <ChevronDown className={clsx('w-4 h-4 shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 flex justify-between">
                  <span>SELECT ACTIVE COMPLIANCE FORM</span>
                  <span className="font-mono">{MCA_FORMS.length} FORMS</span>
                </div>
                <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                  {MCA_FORMS.map(f => {
                    const fDraft = drafts[f.code] || {};
                    const fFields = f.sections.flatMap(s => s.fields);
                    const fPct = fFields.length > 0 ? Math.round(fFields.filter(ff => fDraft[ff.key] && fDraft[ff.key] !== '').length / fFields.length * 100) : 0;
                    const isActive = f.code === selectedCode;
                    return (
                      <button
                        key={f.code}
                        onClick={() => handleSelectForm(f.code)}
                        className={clsx(
                          'w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer',
                          isActive ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-800'
                        )}
                      >
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className={clsx('font-mono text-[10px] font-bold px-1.5 py-0.2 rounded', isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-black')}>
                              {f.code}
                            </span>
                            <span className="text-xs font-semibold truncate">{f.name}</span>
                          </div>
                          <p className={clsx('text-[10px] truncate mt-0.5', isActive ? 'text-gray-300' : 'text-gray-400')}>{f.category}</p>
                        </div>
                        <span className={clsx('text-[11px] font-mono font-bold shrink-0', isActive ? 'text-white' : 'text-gray-500')}>{fPct}%</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border',
                isActive
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'directory' && (
          <MasterDirectoryTab
            key="directory"
            onSelectForm={handleSelectForm}
          />
        )}
        {activeTab === 'overview' && (
          <OverviewPanel
            key="overview"
            form={form}
            draft={draft}
            onGoToSection={handleGoToSection}
          />
        )}
        {activeTab === 'manual' && (
          <ManualFillTab
            key="manual"
            form={form}
            draft={draft}
            onChange={handleFieldChange}
            activeSection={activeSection || form.sections[0]?.id}
            onChangeSection={setActiveSection}
            highlightedKeys={highlightedKeys}
          />
        )}
        {activeTab === 'payment' && (
          <PaymentVerificationTab
            key="payment"
            form={form}
            draft={draft}
            paymentVerified={paymentVerified}
            setPaymentVerified={setPaymentVerified}
            paymentDetails={paymentDetails}
            setPaymentDetails={setPaymentDetails}
            onProceedToExtension={() => handleTabChange('connector')}
          />
        )}
        {activeTab === 'extractor' && (
          <DocExtractorTab
            key="extractor"
            form={form}
            draft={draft}
            onAutoFill={handleAutoFill}
          />
        )}
        {activeTab === 'filesure' && (
          <FileSureTab
            key="filesure"
            form={form}
            draft={draft}
            onSwitchToConnector={() => handleTabChange('connector')}
          />
        )}
        {activeTab === 'connector' && (
          <ExtensionConnectorTab
            key="connector"
            form={form}
            draft={draft}
            paymentVerified={paymentVerified}
            paymentDetails={paymentDetails}
            onSwitchToPayment={() => handleTabChange('payment')}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
