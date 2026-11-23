// AOC-4 scanner schema. Output mirrors extension/clients/*_aoc4.json so the
// extension's flattenClient() can consume a scan result without conversion.

const BS_KEYS = [
  'SHARE_CAPITAL', 'RESERVES_SURPLUS', 'MONEY_AGAINST_WARRANTS', 'SHARE_APP_PENDING',
  'LONG_TERM_BORROWINGS', 'DEFERRED_TAX_LIAB', 'OTHER_LONG_TERM_LIAB', 'LONG_TERM_PROVISIONS',
  'SHORT_TERM_BORROWINGS', 'TRADE_PAYABLES_MSME', 'TRADE_PAYABLES_OTHER', 'OTHER_CURRENT_LIAB',
  'SHORT_TERM_PROVISIONS', 'TOTAL_EQUITY_LIABILITIES',
  'PPE', 'INTANGIBLE_ASSETS', 'CWIP', 'INTANGIBLE_UNDER_DEV', 'NON_CURRENT_INVESTMENTS',
  'DEFERRED_TAX_ASSETS', 'LONG_TERM_LOANS_ADVANCES', 'OTHER_NON_CURRENT_ASSETS',
  'CURRENT_INVESTMENTS', 'INVENTORIES', 'TRADE_RECEIVABLES', 'CASH_EQUIVALENTS',
  'SHORT_TERM_LOANS_ADVANCES', 'OTHER_CURRENT_ASSETS', 'TOTAL_ASSETS',
];

const PL_KEYS = [
  'REVENUE_OPERATIONS', 'OTHER_INCOME', 'TOTAL_INCOME', 'EMPLOYEE_EXPENSES',
  'MANAGERIAL_REMUNERATION', 'FINANCE_COSTS', 'DEPRECIATION', 'OTHER_EXPENSES', 'TOTAL_EXPENSES',
  'PROFIT_BEFORE_TAX', 'CURRENT_TAX', 'DEFERRED_TAX', 'TOTAL_TAX', 'PROFIT_AFTER_TAX',
  'EPS_BASIC', 'EPS_DILUTED',
];

const BS_BREAKUP_KEYS = [
  'BS_UNSEC_LT_BANK_LOANS', 'BS_UNSEC_LT_RELATED_PARTIES', 'BS_UNSEC_LT_OTHER_TERM_LOANS',
  'BS_UNSEC_LT_DEPOSITS', 'BS_UNSEC_ST_BANK_DEMAND', 'BS_UNSEC_ST_RELATED_PARTIES',
  'BS_TRADE_RECEIVABLES_SECURED_GOOD', 'BS_TRADE_RECEIVABLES_UNSECURED_GOOD',
  'BS_TRADE_RECEIVABLES_DOUBTFUL', 'BS_TRADE_RECEIVABLES_PROVISION',
];

const PL_DETAIL_KEYS = [
  'PL_DOMESTIC_MANUFACTURED', 'PL_DOMESTIC_TRADED', 'PL_DOMESTIC_SERVICES',
  'PL_EXPORT_MANUFACTURED', 'PL_EXPORT_TRADED', 'PL_EXPORT_SERVICES',
  'PL_DIVIDEND_INCOME', 'PL_INTEREST_INCOME', 'PL_OTHER_NONOPERATING_INCOME',
  'PL_MATERIALS_CONSUMED', 'PL_STOCK_PURCHASES', 'PL_EMPLOYEE_BENEFITS',
  'PL_AUDITOR_PAYMENT', 'PL_INSURANCE', 'PL_POWER_FUEL', 'PL_FINANCE_COSTS',
  'PL_DEPRECIATION', 'PL_OTHER_EXPENSES',
];

const TEXT_SECTIONS = {
  general: {
    CIN: '', COMPANY_NAME: '', FY_FROM: 'DD/MM/YYYY', FY_TO: 'DD/MM/YYYY',
    BOARD_MEETING_DATE: 'DD/MM/YYYY', NATURE_FS: 'adopted | provisional',
    PROVISIONAL_FILED_EARLIER: 'Yes | No', ADOPTED_IN_ADJOURNED_AGM: 'Yes | No',
    BOARD_REPORT_DATE: 'DD/MM/YYYY', AUDITOR_SIGN_DATE: 'DD/MM/YYYY',
    AGM_HELD: 'Yes | No', AGM_DATE: 'DD/MM/YYYY', AGM_DUE_DATE: 'DD/MM/YYYY', AGM_EXTENSION: 'Yes | No',
  },
  auditor: {
    ADT_SRN: '', NUM_AUDITORS: '1', AUDITOR_PAN: 'firm or individual PAN', AUDITOR_CATEGORY: "Auditor's firm | Individual",
    AUDITOR_FIRM_REG: 'ICAI firm registration no, e.g. 018971S', AUDITOR_NAME: 'firm name', UDIN: '',
    AUDITOR_ADDR1: '', AUDITOR_ADDR2: '', AUDITOR_CITY: '', AUDITOR_DISTRICT: '', AUDITOR_STATE: '',
    AUDITOR_PIN: '', AUDITOR_COUNTRY: 'India', MEMBER_NAME: 'signing partner', MEMBER_NUMBER: 'membership no',
  },
  industry: {
    TYPE_OF_INDUSTRY: 'Commercial & Industrial | Banking | Insurance | Power | NBFC | Housing Finance',
    SCHEDULE_III: 'Yes | No', CONSOLIDATED_FS: 'Yes | No', MAINTAIN_ELECTRONIC_BOOKS: 'Yes | No',
  },
  subsidiary: { IS_SUBSIDIARY: 'Yes | No', HAS_SUBSIDIARY_OR_JV: 'Yes | No' },
  shareCapital: {
    FACE_VALUE: 'number per share', AUTH_SHARES: 'count', ISSUED_SHARES: 'count', PAID_UP_SHARES: 'count',
    AUTH_NOMINAL: 'amount', ISSUED_NOMINAL: 'amount', PAID_UP_NOMINAL: 'amount',
  },
  financialParametersBS: { NET_WORTH: 'amount', GROSS_PPE_INTANGIBLE: 'amount', DEPRECIATION_AMORTIZATION_BS: 'accumulated, amount' },
  financialParametersPL: {
    FP_PL_PROPOSED_DIVIDEND: 'amount', FP_PL_RENT_PAID: 'amount', FP_PL_RELATED_PARTY_GROSS: 'amount',
    FP_PL_FOREIGN_INCOME: 'amount', FP_PL_FOREIGN_EXPENDITURE: 'amount', FP_PL_GOVERNMENT_GRANTS: 'amount',
  },
  principalProducts: {
    CATEGORY_CODE: 'ITC/NPCS 4-digit', CATEGORY_DESC: '', CATEGORY_TURNOVER: 'amount',
    HIGHEST_CODE: '', HIGHEST_DESC: '', HIGHEST_TURNOVER: 'amount',
  },
  relatedParty: { ANY_TRANSACTION: 'Yes | No' },
  auditorReport: { QUALIFIED_OPINION: 'Yes | No', CAG_COMMENTED: 'Yes | No | Not applicable' },
  csr: { CSR_APPLICABILITY: 'Applicable | Not applicable' },
  secretarialAudit: { SECRETARIAL_AUDIT_APPLICABLE: 'Yes | No' },
  costRecords: { MAINTENANCE_MANDATED: 'Yes | No', AUDIT_MANDATED: 'Yes | No' },
};

const AMOUNT_EXCLUDE = /^(EPS_|FACE_VALUE$|AUTH_SHARES$|ISSUED_SHARES$|PAID_UP_SHARES$|asOf$|period$)|_EPS_|PERCENT/;

function zeroMap(keys) {
  return Object.fromEntries(keys.map(k => [k, 0]));
}
function pairMap(keys) {
  return Object.fromEntries(keys.map(k => [k, { current: 0, previous: 0 }]));
}

const META_SKELETON = {
  sourceUnit: 'exact unit printed on the statements, e.g. "Indian Rupees Hundred"',
  unitMultiplier: 'number: 1 Rupees, 100 Hundreds, 1000 Thousands, 100000 Lakhs, 10000000 Crores',
  uncertain: ['dotted paths of values that were hard to read'],
  derived: ['dotted paths of values you computed rather than read'],
  notes: 'one short sentence, e.g. which statement is missing',
};

// The G8 gateway caps each reply at 4096 tokens, so AOC-4 is extracted in
// parallel parts that each fit, then merged by mergeAoc4Parts().
export const AOC4_PARTS = [
  {
    name: 'company & auditor',
    focus: 'the auditor\'s report, the signature blocks, and company details',
    skeleton: {
      general: TEXT_SECTIONS.general,
      signatoriesFS: [{ din: '8 digits', name: '', designation: 'Director | Managing Director | CFO | Company Secretary', date: 'DD/MM/YYYY' }],
      signatoriesBR: [{ din: '', name: '', designation: '', date: '' }],
      auditor: TEXT_SECTIONS.auditor,
      industry: TEXT_SECTIONS.industry,
      subsidiary: TEXT_SECTIONS.subsidiary,
      relatedParty: TEXT_SECTIONS.relatedParty,
      auditorReport: TEXT_SECTIONS.auditorReport,
      csr: TEXT_SECTIONS.csr,
      secretarialAudit: TEXT_SECTIONS.secretarialAudit,
      costRecords: TEXT_SECTIONS.costRecords,
    },
  },
  {
    name: 'balance sheet',
    focus: 'the Balance Sheet and its notes (borrowings, trade receivables)',
    skeleton: {
      balanceSheet: {
        current: { asOf: 'DD/MM/YYYY', ...zeroMap(BS_KEYS) },
        previous: { asOf: 'DD/MM/YYYY', ...zeroMap(BS_KEYS) },
      },
      balanceSheetBreakup: pairMap(BS_BREAKUP_KEYS),
    },
  },
  {
    name: 'profit & loss',
    focus: 'the Statement of Profit and Loss and its notes (revenue, other income, employee benefits, finance costs, depreciation from the fixed assets / PPE note, other expenses, tax, EPS)',
    skeleton: {
      profitLoss: { current: zeroMap(PL_KEYS), previous: zeroMap(PL_KEYS) },
      profitLossDetails: pairMap(PL_DETAIL_KEYS),
    },
  },
  {
    name: 'share capital & parameters',
    focus: 'the share capital note, fixed assets note, and disclosures',
    skeleton: {
      shareCapital: TEXT_SECTIONS.shareCapital,
      shareholders: [{ name: '', shares: 0, percent: 0 }],
      financialParametersBS: TEXT_SECTIONS.financialParametersBS,
      financialParametersPL: TEXT_SECTIONS.financialParametersPL,
      principalProducts: TEXT_SECTIONS.principalProducts,
    },
  },
];

export function buildAoc4PartPrompt(part) {
  return `You are a Chartered Accountant preparing MCA Form AOC-4 from a company's audited financial statements. Read every page, including scanned and handwritten text. For this request focus on ${part.focus}.

Return ONLY minified JSON on a single line (no markdown, no indentation) with exactly this structure; placeholder strings describe the expected value:
${JSON.stringify({ meta: META_SKELETON, ...part.skeleton })}

Work like a fast data-entry operator: transcribe values directly from the pages and answer immediately. Do not add up, verify or reconcile figures — software computes and checks totals afterwards.

Rules:
- Amounts: plain numbers exactly as printed, in the document's own unit. Do NOT convert units; report the unit in meta.sourceUnit and meta.unitMultiplier. Bracketed figures and deficits are negative.
- "current" = the financial year being reported; "previous" = the comparative column.
- Not printed in the document: "" for text, null for numbers. Never invent values; leave unprinted totals null.
- If the Statement of Profit and Loss page is missing, take each line from its note total and add "profitLoss" to meta.derived.
- signatoriesFS: who signed the financial statements (name, DIN, date). With no separate Board's report, copy them to signatoriesBR and add "signatoriesBR" to meta.derived.
- auditor: firm, FRN, signing partner, membership no., UDIN and address from the audit report signature block.
- shareholders: from the share capital note (holders above 5%).
- Dates DD/MM/YYYY. meta.uncertain and meta.derived: at most 8 short paths each.`;
}

// Merges part replies into one client object. Part order matters only for meta.
export function mergeAoc4Parts(parts) {
  const merged = {};
  const meta = { uncertain: [], derived: [], notes: [], failedParts: [] };
  for (const p of parts) {
    if (!p.json) {
      meta.failedParts.push(`${p.name}: ${p.error}`);
      continue;
    }
    const { meta: m = {}, ...sections } = p.json;
    Object.assign(merged, sections);
    meta.uncertain.push(...(Array.isArray(m.uncertain) ? m.uncertain : []));
    meta.derived.push(...(Array.isArray(m.derived) ? m.derived : []));
    if (m.notes) meta.notes.push(String(m.notes));
    // The balance-sheet part is the most reliable reader of the unit line.
    if (meta.unitMultiplier === undefined || p.name === 'balance sheet') {
      if (m.unitMultiplier !== undefined && m.unitMultiplier !== '') meta.unitMultiplier = m.unitMultiplier;
      if (m.sourceUnit) meta.sourceUnit = m.sourceUnit;
    }
  }
  const sentences = meta.notes.flatMap(n => n.split(/(?<=[.;])\s+/)).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  meta.notes = sentences.filter(s => {
    const key = s.toLowerCase().replace(/\(.*?\)|[^a-z ]/g, '').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(' ');
  meta.uncertain = [...new Set(meta.uncertain)];
  meta.derived = [...new Set(meta.derived)];
  merged.meta = meta;
  return merged;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  const n = Number(s.replace(/[(),\s₹]/g, '').replace(/^-/, ''));
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

function scale(v, mult, key) {
  const n = toNumber(v);
  if (n === null) return null;
  if (mult === 1 || AMOUNT_EXCLUDE.test(key)) return n;
  return Math.round(n * mult * 100) / 100;
}

function scaleFlat(obj, mult, onlyKeys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (k === 'asOf' || k === 'period') continue;
    if (onlyKeys && !onlyKeys.test(k)) continue;
    out[k] = scale(out[k], mult, k);
  }
  return out;
}

function scalePairs(obj, mult) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = { current: scale(v?.current, mult, k), previous: scale(v?.previous, mult, k) };
  }
  return out;
}

const round2 = n => Math.round(n * 100) / 100;
const isNum = v => typeof v === 'number' && Number.isFinite(v);

// Fills totals the document didn't print (or the model left null) from their
// components, so arithmetic never depends on the model. Each fill is marked derived.
function deriveTotals(data, derived) {
  for (const per of ['current', 'previous']) {
    const b = data.balanceSheet?.[per];
    if (b) {
      const liab = BS_KEYS.slice(0, BS_KEYS.indexOf('TOTAL_EQUITY_LIABILITIES'));
      const assets = BS_KEYS.slice(BS_KEYS.indexOf('TOTAL_EQUITY_LIABILITIES') + 1, BS_KEYS.indexOf('TOTAL_ASSETS'));
      if (!isNum(b.TOTAL_EQUITY_LIABILITIES) && liab.some(k => isNum(b[k]))) {
        b.TOTAL_EQUITY_LIABILITIES = round2(liab.reduce((s, k) => s + (b[k] || 0), 0));
        derived.push(`balanceSheet.${per}.TOTAL_EQUITY_LIABILITIES`);
      }
      if (!isNum(b.TOTAL_ASSETS) && assets.some(k => isNum(b[k]))) {
        b.TOTAL_ASSETS = round2(assets.reduce((s, k) => s + (b[k] || 0), 0));
        derived.push(`balanceSheet.${per}.TOTAL_ASSETS`);
      }
    }

    const p = data.profitLoss?.[per];
    if (!p) continue;
    const set = (k, v) => { p[k] = round2(v); derived.push(`profitLoss.${per}.${k}`); };
    if (!isNum(p.TOTAL_INCOME) && (isNum(p.REVENUE_OPERATIONS) || isNum(p.OTHER_INCOME))) {
      set('TOTAL_INCOME', (p.REVENUE_OPERATIONS || 0) + (p.OTHER_INCOME || 0));
    }
    // Managerial remuneration is already inside employee expenses, so it is not added again.
    const expLines = ['EMPLOYEE_EXPENSES', 'FINANCE_COSTS', 'DEPRECIATION', 'OTHER_EXPENSES'];
    const costLines = ['PL_MATERIALS_CONSUMED', 'PL_STOCK_PURCHASES'].map(k => data.profitLossDetails?.[k]?.[per]);
    if (!isNum(p.TOTAL_EXPENSES) && expLines.some(k => isNum(p[k]))) {
      set('TOTAL_EXPENSES', expLines.reduce((s, k) => s + (p[k] || 0), 0) + costLines.reduce((s, v) => s + (isNum(v) ? v : 0), 0));
    }
    if (!isNum(p.TOTAL_TAX) && (isNum(p.CURRENT_TAX) || isNum(p.DEFERRED_TAX))) {
      set('TOTAL_TAX', (p.CURRENT_TAX || 0) + (p.DEFERRED_TAX || 0));
    }
    if (!isNum(p.PROFIT_BEFORE_TAX) && isNum(p.TOTAL_INCOME) && isNum(p.TOTAL_EXPENSES)) {
      set('PROFIT_BEFORE_TAX', p.TOTAL_INCOME - p.TOTAL_EXPENSES);
    }
    if (!isNum(p.PROFIT_AFTER_TAX) && isNum(p.PROFIT_BEFORE_TAX)) {
      set('PROFIT_AFTER_TAX', p.PROFIT_BEFORE_TAX - (p.TOTAL_TAX || 0));
    }
    const shares = data.shareCapital?.PAID_UP_SHARES;
    if (!isNum(p.EPS_BASIC) && isNum(p.PROFIT_AFTER_TAX) && isNum(shares) && shares > 0) {
      set('EPS_BASIC', p.PROFIT_AFTER_TAX / shares);
    }
    if (!isNum(p.EPS_DILUTED) && isNum(p.EPS_BASIC)) set('EPS_DILUTED', p.EPS_BASIC);

    // AOC-4's detailed "other expenses" excludes lines itemised separately in the same schedule.
    const det = data.profitLossDetails;
    const other = det?.PL_OTHER_EXPENSES;
    if (other && isNum(other[per]) && isNum(p.OTHER_EXPENSES) && Math.abs(other[per] - p.OTHER_EXPENSES) < 1) {
      const itemised = ['PL_AUDITOR_PAYMENT', 'PL_INSURANCE', 'PL_POWER_FUEL']
        .reduce((s, k) => s + (isNum(det[k]?.[per]) ? det[k][per] : 0), 0);
      if (itemised > 0) {
        other[per] = round2(p.OTHER_EXPENSES - itemised);
        derived.push(`profitLossDetails.PL_OTHER_EXPENSES.${per}`);
      }
    }
  }

  const bc = data.balanceSheet?.current;
  const fp = data.financialParametersBS;
  if (fp && !isNum(fp.NET_WORTH) && bc && isNum(bc.SHARE_CAPITAL) && isNum(bc.RESERVES_SURPLUS)) {
    fp.NET_WORTH = round2(bc.SHARE_CAPITAL + bc.RESERVES_SURPLUS + (bc.MONEY_AGAINST_WARRANTS || 0));
    derived.push('financialParametersBS.NET_WORTH');
  }
}

// A statement that was read but has no line for an item means nil; MCA expects 0
// there. Totals, profits and EPS are never nil-filled — blank means unknown.
const NEVER_NIL = /^(TOTAL_|PROFIT_|EPS_)/;
function fillNil(data) {
  const nil = [];
  const fill = (obj, prefix) => {
    if (!obj || !Object.values(obj).some(isNum)) return;
    for (const k of Object.keys(obj)) {
      if (obj[k] === null && !NEVER_NIL.test(k)) { obj[k] = 0; nil.push(`${prefix}.${k}`); }
    }
  };
  for (const per of ['current', 'previous']) {
    fill(data.balanceSheet?.[per], `balanceSheet.${per}`);
    fill(data.profitLoss?.[per], `profitLoss.${per}`);
  }
  for (const sec of ['balanceSheetBreakup', 'profitLossDetails']) {
    const s = data[sec];
    if (!s || !Object.values(s).some(v => isNum(v?.current) || isNum(v?.previous))) continue;
    for (const [k, v] of Object.entries(s)) {
      for (const per of ['current', 'previous']) {
        if (v && v[per] === null) { v[per] = 0; nil.push(`${sec}.${k}.${per}`); }
      }
    }
  }
  return nil;
}

// Converts printed amounts to absolute rupees and stamps the client identity
// fields the extension's importClient handler keys on.
export function postProcessAoc4(raw) {
  const data = { ...raw };
  const meta = { uncertain: [], derived: [], ...(data.meta || {}) };
  let mult = Number(meta.unitMultiplier);
  if (!Number.isFinite(mult) || mult <= 0) mult = 1;
  meta.unitMultiplier = mult;
  meta.convertedTo = 'Rupees';

  if (data.balanceSheet) {
    data.balanceSheet = {
      scaleNote: mult === 1 ? 'Values in Rupees as printed.' : `Converted from ${meta.sourceUnit || 'source unit'} to Rupees (x${mult}).`,
      current: scaleFlat(data.balanceSheet.current, mult),
      previous: scaleFlat(data.balanceSheet.previous, mult),
    };
  }
  if (data.profitLoss) {
    data.profitLoss = {
      current: scaleFlat(data.profitLoss.current, mult),
      previous: scaleFlat(data.profitLoss.previous, mult),
    };
  }
  data.balanceSheetBreakup = scalePairs(data.balanceSheetBreakup, mult);
  data.profitLossDetails = scalePairs(data.profitLossDetails, mult);
  data.shareCapital = scaleFlat(data.shareCapital, mult);
  data.financialParametersBS = scaleFlat(data.financialParametersBS, mult);
  data.financialParametersPL = scaleFlat(data.financialParametersPL, mult);
  data.principalProducts = scaleFlat(data.principalProducts, mult, /TURNOVER$/);
  if (Array.isArray(data.shareholders)) {
    data.shareholders = data.shareholders.map(s => ({ ...s, shares: toNumber(s.shares), percent: toNumber(s.percent) }));
  }
  meta.derived = [...meta.derived];
  deriveTotals(data, meta.derived);
  meta.nil = fillNil(data);
  deriveTotals(data, meta.derived);
  meta.derived = [...new Set(meta.derived)];

  const cin = String(data.general?.CIN || '').trim().toUpperCase();
  if (data.general) data.general.CIN = cin;
  const fyTo = String(data.general?.FY_TO || '').replace(/\D/g, '');
  data.clientId = (cin ? `${cin}_${fyTo}` : `scan_${Date.now()}`).toLowerCase();
  data.displayName = `${data.general?.COMPANY_NAME || cin || 'Scanned company'} — AOC-4`;
  data.source = 'germin8-ai-scanner';
  data.meta = meta;
  return data;
}
