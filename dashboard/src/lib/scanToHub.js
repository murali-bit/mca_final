// Maps a real scanner result (backend /api/gateway/claude/vision|extract) onto the
// MCA Forms Hub field keys from data/mcaForms.js.

// Hub form code -> scanner form id. Forms not listed can't be scanned yet.
export const SCAN_FORM_ID = {
  'AOC-4': 'AOC-4',
  'ADT-1': 'ADT-1',
  'MGT-7': 'MGT-7',
  'DIR-3-KYC': 'DIR-3 KYC',
};

const isBlank = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

function dmyToIso(v) {
  const m = String(v).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

const norm = s => String(s).toLowerCase().replace(/govt/g, 'government').replace(/[^a-z0-9]/g, '');

function matchOption(options, value) {
  const v = norm(value);
  if (!v) return null;
  return options.find(o => norm(o) === v)
    || options.find(o => norm(o).startsWith(v) || v.startsWith(norm(o)))
    || options.find(o => norm(o).includes(v) || v.includes(norm(o)))
    || null;
}

const inr = v => (typeof v === 'number' ? v.toLocaleString('en-IN') : v);

function sum(obj, keys) {
  const nums = keys.map(k => obj?.[k]).filter(v => typeof v === 'number');
  return nums.length ? nums.reduce((s, n) => s + n, 0) : null;
}

// AOC-4 scans come back in the extension's nested client shape; the hub shows a summary.
function aoc4Candidates(d) {
  const g = d.general || {};
  const a = d.auditor || {};
  const bs = d.balanceSheet?.current || {};
  const pl = d.profitLoss?.current || {};
  const sc = d.shareCapital || {};
  const [s1 = {}, s2 = {}] = d.signatoriesFS || [];
  const br1 = (d.signatoriesBR || [])[0] || s1;
  return {
    cin: g.CIN,
    companyName: g.COMPANY_NAME,
    authorisedCapital: inr(sc.AUTH_NOMINAL),
    numberOfMembers: Array.isArray(d.shareholders) && d.shareholders.length ? d.shareholders.length : null,
    financialYearFrom: g.FY_FROM,
    financialYearTo: g.FY_TO,
    boardMeetingDateFS: g.BOARD_MEETING_DATE,
    natureOfFS: g.NATURE_FS,
    provisionalFSFiled: g.PROVISIONAL_FILED_EARLIER,
    adoptedInAdjournedAGM: g.ADOPTED_IN_ADJOURNED_AGM,
    director1DIN: s1.din,
    director1Name: s1.name,
    director1Designation: s1.designation,
    director1DateFS: s1.date,
    director2DIN: s2.din,
    director2Name: s2.name,
    director2Designation: s2.designation,
    boardMeetingDateBR: g.BOARD_REPORT_DATE,
    director1DateBR: br1.date,
    agmHeld: g.AGM_HELD,
    agmDate: g.AGM_DATE,
    agmDueDate: g.AGM_DUE_DATE,
    agmExtensionGranted: g.AGM_EXTENSION,
    auditorCategory: a.AUDITOR_CATEGORY,
    firmRegistrationNumber: a.AUDITOR_FIRM_REG,
    auditorName: a.AUDITOR_NAME,
    auditorAddress: [a.AUDITOR_ADDR1, a.AUDITOR_ADDR2, a.AUDITOR_CITY, a.AUDITOR_STATE, a.AUDITOR_PIN].filter(x => !isBlank(x)).join(', '),
    auditorPan: a.AUDITOR_PAN,
    membershipNumber: a.MEMBER_NUMBER,
    auditorReportDate: g.AUDITOR_SIGN_DATE,
    shareCapital: inr(bs.SHARE_CAPITAL),
    reservesSurplus: inr(bs.RESERVES_SURPLUS),
    nonCurrentLiabilities: inr(sum(bs, ['LONG_TERM_BORROWINGS', 'DEFERRED_TAX_LIAB', 'OTHER_LONG_TERM_LIAB', 'LONG_TERM_PROVISIONS'])),
    currentLiabilities: inr(sum(bs, ['SHORT_TERM_BORROWINGS', 'TRADE_PAYABLES_MSME', 'TRADE_PAYABLES_OTHER', 'OTHER_CURRENT_LIAB', 'SHORT_TERM_PROVISIONS'])),
    totalEquityLiabilities: inr(bs.TOTAL_EQUITY_LIABILITIES),
    fixedAssets: inr(bs.PPE),
    currentAssets: inr(sum(bs, ['CURRENT_INVESTMENTS', 'INVENTORIES', 'TRADE_RECEIVABLES', 'CASH_EQUIVALENTS', 'SHORT_TERM_LOANS_ADVANCES', 'OTHER_CURRENT_ASSETS'])),
    totalAssets: inr(bs.TOTAL_ASSETS),
    revenueFromOperations: inr(pl.REVENUE_OPERATIONS),
    profitBeforeTax: inr(pl.PROFIT_BEFORE_TAX),
    taxExpense: inr(pl.CURRENT_TAX),
    profitAfterTax: inr(pl.PROFIT_AFTER_TAX),
  };
}

function mgt7Candidates(d) {
  return {
    ...d,
    financialYearFrom: d.finYearFrom,
    financialYearTo: d.finYearTo,
    emailId: d.companyEmail,
    telephone: d.companyPhone,
  };
}

function dir3Candidates(d) {
  const parts = String(d.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    ...d,
    directorName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    addressLine1: [d.addr1, d.addr2].filter(x => !isBlank(x)).join(', '),
  };
}

// Returns { values, filledKeys, notPlaced: [{ key, label, value, reason }] }.
export function mapScanToHub(form, scanResult) {
  const raw = scanResult?.extractedFields || {};
  const candidates = scanResult?.schema === 'aoc4-client' || form.code === 'AOC-4'
    ? aoc4Candidates(raw)
    : form.code === 'MGT-7' ? mgt7Candidates(raw)
      : form.code === 'DIR-3-KYC' ? dir3Candidates(raw)
        : raw;

  const values = {};
  const notPlaced = [];
  for (const field of form.sections.flatMap(s => s.fields)) {
    const v = candidates[field.key];
    if (isBlank(v)) continue;
    if (field.type === 'date') {
      const iso = dmyToIso(v) || (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);
      if (iso) values[field.key] = iso;
      else notPlaced.push({ key: field.key, label: field.label, value: String(v), reason: 'not a DD/MM/YYYY date' });
    } else if (field.type === 'select' || field.type === 'radio') {
      const opt = matchOption(field.options || [], v);
      if (opt) values[field.key] = opt;
      else notPlaced.push({ key: field.key, label: field.label, value: String(v), reason: 'not one of the options' });
    } else {
      values[field.key] = typeof v === 'number' ? String(v) : String(v).trim();
    }
  }
  return { values, filledKeys: Object.keys(values), notPlaced };
}
