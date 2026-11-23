// AOC-4 pre-fill checks and MCA error explanations.
//
// AOC-4 is processed STP: MCA takes it on record with no resubmission, so a wrong figure can only
// be corrected by a revised filing. These checks run on the client data BEFORE the first field is
// typed, and catch what MCA would otherwise reject one Save at a time (or, worse, accept).
// Rules follow the MCA instruction kit for AOC-4 / AOC-4 XBRL and Schedule III arithmetic.
//
//   Aoc4Checks.run(flatData, { today })  → { errors, warnings, info, deadline }
//       flatData is what flattenClient() in field-mapper.js produces (CIN, FY_TO, SHARE_CAPITAL_CUR,
//       PL_OTHER_EXPENSES_CUR, ...). Each item: { key, title, detail }.
//       errors   = the fill must not start (data is wrong, or this is the wrong form)
//       warnings = MCA will stop a Save on this, or a CA should look at it first
//   Aoc4Checks.explain(text)             → plain-language meaning + fix for a raw MCA message
//
// Pure logic: no DOM, no chrome.* — also runs under Node for testing.

(function (root) {
  "use strict";

  const CFG = {
    // Fee-free windows from MCA circulars, keyed by FY end (YYYY-MM-DD). Not statutory extensions:
    // filing after the window is charged from the original due date.
    feeFreeUntil: { "2025-03-31": "31/01/2026", "2026-03-31": "31/12/2026" },
    additionalFeePerDay: 100,
    normalFee: [[1e5, 200], [5e5, 300], [25e5, 400], [1e7, 500], [Infinity, 600]],
    // Companies (Filing of documents and forms in XBRL) Rules, 2015.
    xbrl: { paidUp: 5e7, turnover: 100e7 },
    // Sec 135(1), measured on the immediately preceding FY.
    csr: { netWorth: 500e7, turnover: 1000e7, netProfit: 5e7 },
  };

  const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
  const DIN_RE = /^\d{8}$/;
  const SRN_RE = /^[A-Z]{1,2}\d{7,9}$/;
  const DAY = 86400000;

  function parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s) ? null : new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const str = String(s).trim();
    let m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    const mk = (y, mo, d) => { const dt = new Date(y, mo - 1, d); return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null; };
    if (m) return mk(+m[3], +m[2], +m[1]);
    m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? mk(+m[1], +m[2], +m[3]) : null;
  }
  const fmt = d => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const addMonths = (d, n) => { const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0); return last.getDate() < d.getDate() ? last : new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); };
  const blank = v => v === undefined || v === null || String(v).trim() === "";
  const yes = v => /^y(es)?$/i.test(String(v || "").trim());
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");

  const BS_LIAB = ["SHARE_CAPITAL", "RESERVES_SURPLUS", "MONEY_AGAINST_WARRANTS", "SHARE_APP_PENDING", "LONG_TERM_BORROWINGS",
    "DEFERRED_TAX_LIAB", "OTHER_LONG_TERM_LIAB", "LONG_TERM_PROVISIONS", "SHORT_TERM_BORROWINGS", "TRADE_PAYABLES_MSME",
    "TRADE_PAYABLES_OTHER", "OTHER_CURRENT_LIAB", "SHORT_TERM_PROVISIONS"];
  const BS_ASSET = ["PPE", "INTANGIBLE_ASSETS", "CWIP", "INTANGIBLE_UNDER_DEV", "NON_CURRENT_INVESTMENTS", "DEFERRED_TAX_ASSETS",
    "LONG_TERM_LOANS_ADVANCES", "OTHER_NON_CURRENT_ASSETS", "CURRENT_INVESTMENTS", "INVENTORIES", "TRADE_RECEIVABLES",
    "CASH_EQUIVALENTS", "SHORT_TERM_LOANS_ADVANCES", "OTHER_CURRENT_ASSETS"];
  const PL_SALES = ["PL_DOMESTIC_MANUFACTURED", "PL_DOMESTIC_TRADED", "PL_DOMESTIC_SERVICES", "PL_EXPORT_MANUFACTURED", "PL_EXPORT_TRADED", "PL_EXPORT_SERVICES"];
  const PL_OTHER_INCOME = ["PL_DIVIDEND_INCOME", "PL_INTEREST_INCOME", "PL_INVESTMENT_GAIN_LOSS", "PL_OTHER_NONOPERATING_INCOME"];
  const PL_EXPENSES = ["PL_MATERIALS_CONSUMED", "PL_STOCK_PURCHASES", "PL_INVENTORY_FINISHED", "PL_INVENTORY_WIP", "PL_INVENTORY_STOCK",
    "PL_EMPLOYEE_BENEFITS", "PL_MANAGERIAL_REMUNERATION", "PL_AUDITOR_PAYMENT", "PL_INSURANCE", "PL_POWER_FUEL", "PL_FINANCE_COSTS",
    "PL_DEPRECIATION", "PL_OTHER_EXPENSES"];

  function run(d, opts) {
    d = d || {}; opts = opts || {};
    const today = parseDate(opts.today || new Date());
    const out = { errors: [], warnings: [], info: [], deadline: null };
    const err = (key, title, detail) => out.errors.push({ key, title, detail: detail || "" });
    const warn = (key, title, detail) => out.warnings.push({ key, title, detail: detail || "" });
    const note = (key, title, detail) => out.info.push({ key, title, detail: detail || "" });
    const num = k => { const v = d[k]; if (blank(v)) return null; const n = Number(String(v).replace(/[,\s₹]/g, "")); return isFinite(n) ? n : null; };
    // Sum of keys with a suffix; null when any of them is absent (an incomplete file is not "wrong").
    const sum = (keys, sfx) => { let t = 0; for (const k of keys) { const n = num(k + sfx); if (n === null) return null; t += n; } return t; };
    const off = (a, b, tol) => a !== null && b !== null && Math.abs(a - b) > (tol == null ? 1 : tol);

    // ── Part A: identity and dates ──
    const cin = String(d.CIN || "").trim().toUpperCase();
    if (!cin) err("CIN", "CIN is missing");
    else if (!CIN_RE.test(cin)) err("CIN", "CIN format is wrong", cin + " — 21 characters, like U74999MH2010PTC123456.");

    const fyFrom = parseDate(d.FY_FROM), fyTo = parseDate(d.FY_TO);
    if (!fyFrom || !fyTo) err("FY", "Financial year dates missing or invalid", "Use DD/MM/YYYY.");
    else if (fyTo < fyFrom) err("FY", "Financial year To is before From");
    else if (today && fyTo > today) err("FY", "Financial year has not ended yet");

    const board = parseDate(d.BOARD_MEETING_DATE);
    // A missing value is a warning (MCA stops that Save); a wrong value is an error (MCA may accept it).
    if (!board) warn("BOARD_MEETING_DATE", "Board meeting date (financial statements approved) is missing", "Mandatory in Part A (Q4a).");
    else {
      if (fyTo && board < fyTo) err("BOARD_MEETING_DATE", "Board meeting date is before the FY end", fmt(board) + " — MCA requires it on or after " + fmt(fyTo) + ".");
      if (today && board > today) err("BOARD_MEETING_DATE", "Board meeting date is in the future");
    }
    const audSign = parseDate(d.AUDITOR_SIGN_DATE);
    if (!audSign) warn("AUDITOR_SIGN_DATE", "Auditor's report signing date is missing");
    else if (board && audSign < board) warn("AUDITOR_SIGN_DATE", "Auditor signed before the Board approved the accounts", fmt(audSign) + " is before " + fmt(board) + " (SA 560/700: the report is dated after approval).");
    const brDate = parseDate(d.BOARD_REPORT_DATE);
    if (brDate && fyTo && brDate < fyTo) err("BOARD_REPORT_DATE", "Board's report date is before the FY end");

    if (blank(d.NATURE_FS)) warn("NATURE_FS", "Nature of financial statements is missing");

    // ── AGM ──
    const agm = parseDate(d.AGM_DATE), agmDue = parseDate(d.AGM_DUE_DATE), agmExt = parseDate(d.AGM_EXT_DUE_DATE);
    if (yes(d.AGM_HELD)) {
      if (!agm) warn("AGM_DATE", "AGM is marked held but its date is missing");
      else {
        if (fyTo && agm < fyTo) err("AGM_DATE", "AGM date is before the FY end");
        if (today && agm > today) err("AGM_DATE", "AGM date is in the future");
        if (board && agm < board) warn("AGM_DATE", "AGM is before the Board approved the accounts", fmt(agm) + " vs " + fmt(board) + ".");
      }
    }
    if (!blank(d.AGM_HELD)) {
      if (!agmDue) warn("AGM_DUE_DATE", "Due date of AGM is missing");
      else if (fyTo && (agmDue < fyTo || agmDue > addMonths(fyTo, 9))) err("AGM_DUE_DATE", "Due date of AGM is out of range", "Must be within 9 months of " + fmt(fyTo) + "; entered " + fmt(agmDue) + ".");
      else if (fyTo && iso(agmDue) !== iso(addMonths(fyTo, 6)) && iso(agmDue) !== iso(addMonths(fyTo, 9)))
        warn("AGM_DUE_DATE", "Due date of AGM looks unusual", "Normally " + fmt(addMonths(fyTo, 6)) + " (6 months), or 9 months for a first AGM; entered " + fmt(agmDue) + ".");
    }
    if (yes(d.AGM_EXTENSION)) {
      if (blank(d.GNL1_SRN)) err("GNL1_SRN", "GNL-1 SRN missing", "AGM extension is marked granted.");
      if (!agmExt) err("AGM_EXT_DUE_DATE", "Extended AGM due date missing");
      else if (agmDue && agmExt < agmDue) err("AGM_EXT_DUE_DATE", "Extended AGM due date is before the original due date");
    }
    const effDue = yes(d.AGM_EXTENSION) && agmExt ? agmExt : agmDue;
    if (agm && effDue && agm > effDue) warn("AGM_DATE", "AGM was held after its due date", fmt(agm) + " vs " + fmt(effDue) + " — Sec 99 default; additional fee runs from the due date.");

    // ── Filing deadline and fee (instruction kit, Part IV) ──
    const base = agm && effDue ? (agm < effDue ? agm : effDue) : (agm || effDue);
    if (base && today) {
      const due = addDays(base, 30);
      const win = fyTo && CFG.feeFreeUntil[iso(fyTo)] ? parseDate(CFG.feeFreeUntil[iso(fyTo)]) : null;
      const lastFree = win && win > due ? win : due;
      const daysLate = today > lastFree ? Math.round((today - due) / DAY) : 0;
      out.deadline = { dueDate: fmt(due), feeFreeUntil: fmt(lastFree), daysLate, additionalFee: daysLate * CFG.additionalFeePerDay };
      if (daysLate > 0) warn("deadline", "Filing is late — additional fee " + inr(daysLate * CFG.additionalFeePerDay), daysLate + " days × ₹100 from the due date " + fmt(due) + ".");
      else {
        const left = Math.round((lastFree - today) / DAY);
        (left <= 10 ? warn : note)("deadline", "File by " + fmt(lastFree) + " — " + left + " day" + (left === 1 ? "" : "s") + " left",
          win && win > due ? "Statutory due date was " + fmt(due) + "; MCA's relaxation waives the additional fee until " + fmt(win) + "." : "30 days from the AGM.");
      }
    }
    const authorised = num("AUTH_NOMINAL");
    if (authorised !== null) note("fee", "Normal filing fee about " + inr(CFG.normalFee.find(([upto]) => authorised < upto)[1]), "On authorised capital " + inr(authorised) + ".");

    // ── Signatories ──
    let fsCount = 0;
    for (const prefix of ["FS", "BR"]) for (let n = 1; n <= 10; n++) {
      const din = d[prefix + "_SIG_" + n + "_DIN"];
      if (blank(din)) continue;
      if (prefix === "FS") fsCount++;
      const who = (prefix === "FS" ? "Financial statements" : "Board's report") + " signatory " + n;
      if (!DIN_RE.test(String(din).trim()) && !PAN_RE.test(String(din).trim().toUpperCase())) err(prefix + "_SIG", who + ": DIN/PAN is invalid", String(din) + " — DIN is 8 digits (keep leading zeros).");
      const sd = parseDate(d[prefix + "_SIG_" + n + "_DATE"]);
      if (!sd) warn(prefix + "_SIG", who + ": signing date missing");
      else if (fyTo && sd < fyTo) err(prefix + "_SIG", who + ": signed before the FY end", fmt(sd));
      else if (today && sd > today) err(prefix + "_SIG", who + ": signing date is in the future", fmt(sd));
    }
    if (!fsCount) warn("FS_SIG", "No signatory of the financial statements in the data", "Sec 134(1) needs the signing directors' DINs.");

    // ── Auditor ──
    if (blank(d.ADT_SRN)) warn("ADT_SRN", "SRN of Form ADT-1 is blank", "MCA loads the auditor from this SRN; Phase 2 cannot be saved without it.");
    else if (!SRN_RE.test(String(d.ADT_SRN).trim().toUpperCase())) warn("ADT_SRN", "ADT-1 SRN format looks wrong", String(d.ADT_SRN));
    if (!blank(d.AUDITOR_PAN) && !PAN_RE.test(String(d.AUDITOR_PAN).trim().toUpperCase())) warn("AUDITOR_PAN", "Auditor PAN format is wrong", String(d.AUDITOR_PAN));
    if (yes(d.MAINTAIN_ELECTRONIC_BOOKS) && (blank(d.SERVER_ADDR1) || blank(d.SERVER_PIN)))
      warn("SERVER_ADDR1", "Books are electronic but the server address is blank", "Q12(b): address where the accounting data is stored (Rule 3, Companies (Accounts) Rules).");
    if (/commercial|nbfc/i.test(d.TYPE_OF_INDUSTRY || "") && /^no?$/i.test(String(d.SCHEDULE_III || "").trim()))
      err("SCHEDULE_III", "Schedule III cannot be \"No\" for this type of industry");

    // ── Balance sheet ──
    for (const [sfx, name] of [["_CUR", "current year"], ["_PREV", "previous year"]]) {
      const liab = sum(BS_LIAB, sfx), assets = sum(BS_ASSET, sfx);
      const tl = num("TOTAL_EQUITY_LIABILITIES" + sfx), ta = num("TOTAL_ASSETS" + sfx);
      if (off(liab, tl)) err("BS", "Equity & liabilities don't add up (" + name + ")", "Lines total " + inr(liab) + ", total says " + inr(tl) + ".");
      if (off(assets, ta)) err("BS", "Assets don't add up (" + name + ")", "Lines total " + inr(assets) + ", total says " + inr(ta) + ".");
      if (off(liab !== null ? liab : tl, assets !== null ? assets : ta)) err("BS", "Balance sheet does not tally (" + name + ")", "Liabilities " + inr(liab !== null ? liab : tl) + " vs assets " + inr(assets !== null ? assets : ta) + ".");
    }
    const sc = num("SHARE_CAPITAL_CUR"), res = num("RESERVES_SURPLUS_CUR");
    if (sc !== null && res !== null && off(num("NET_WORTH"), sc + res + (num("MONEY_AGAINST_WARRANTS_CUR") || 0)))
      warn("NET_WORTH", "Net worth differs from share capital + reserves", inr(num("NET_WORTH")) + " vs " + inr(sc + res) + ". Check any revaluation reserve or miscellaneous expenditure adjustment.");
    if (off(num("PAID_UP_NOMINAL"), sc)) warn("SHARE_CAPITAL", "Paid-up capital differs from balance-sheet share capital", inr(num("PAID_UP_NOMINAL")) + " vs " + inr(sc) + ".");

    // Break-ups must equal their balance-sheet line.
    const tr = sum(["BS_TRADE_RECEIVABLES_SECURED_GOOD", "BS_TRADE_RECEIVABLES_UNSECURED_GOOD", "BS_TRADE_RECEIVABLES_DOUBTFUL"], "_CUR");
    if (tr !== null && off(tr - (num("BS_TRADE_RECEIVABLES_PROVISION_CUR") || 0), num("TRADE_RECEIVABLES_CUR")))
      err("BS_BREAKUP", "Trade receivables break-up ≠ balance sheet", inr(tr - (num("BS_TRADE_RECEIVABLES_PROVISION_CUR") || 0)) + " vs " + inr(num("TRADE_RECEIVABLES_CUR")) + ".");
    const ltl = sum(["BS_LT_LOANS_GOOD_CAPITAL_ADVANCES", "BS_LT_LOANS_GOOD_RELATED_PARTIES", "BS_LT_LOANS_GOOD_OTHER",
      "BS_LT_LOANS_DOUBTFUL_CAPITAL_ADVANCES", "BS_LT_LOANS_DOUBTFUL_RELATED_PARTIES", "BS_LT_LOANS_DOUBTFUL_OTHER"], "_CUR");
    const ltlProv = sum(["BS_LT_LOANS_GOOD_PROVISION_RELATED", "BS_LT_LOANS_GOOD_PROVISION_OTHER", "BS_LT_LOANS_DOUBTFUL_PROVISION_RELATED", "BS_LT_LOANS_DOUBTFUL_PROVISION_OTHER"], "_CUR") || 0;
    if (ltl !== null && off(ltl - ltlProv, num("LONG_TERM_LOANS_ADVANCES_CUR")))
      warn("BS_BREAKUP", "Long-term loans & advances break-up ≠ balance sheet", inr(ltl - ltlProv) + " vs " + inr(num("LONG_TERM_LOANS_ADVANCES_CUR")) + " (secured items are not in the break-up).");

    // ── Profit and loss ──
    let turnover = null, pat = null;
    for (const [sfx, name] of [["_CUR", "current year"], ["_PREV", "previous year"]]) {
      const sales = sum(PL_SALES, sfx), oi = sum(PL_OTHER_INCOME, sfx), exp = sum(PL_EXPENSES, sfx);
      if (sales === null || oi === null || exp === null) continue;
      if (sfx === "_CUR") turnover = sales;
      if (off(sales + oi, num("TOTAL_INCOME" + sfx))) err("PL", "Total income doesn't add up (" + name + ")", "Lines total " + inr(sales + oi) + ", total says " + inr(num("TOTAL_INCOME" + sfx)) + ".");
      if (off(exp, num("TOTAL_EXPENSES" + sfx))) err("PL", "Total expenses don't add up (" + name + ")", "Lines total " + inr(exp) + ", total says " + inr(num("TOTAL_EXPENSES" + sfx)) + ".");
      const pbt = sales + oi - exp - (num("PL_EXCEPTIONAL_ITEMS" + sfx) || 0) - (num("PL_EXTRAORDINARY_ITEMS" + sfx) || 0);
      if (off(pbt, num("PROFIT_BEFORE_TAX" + sfx))) err("PL", "Profit before tax doesn't add up (" + name + ")", "Computed " + inr(pbt) + ", entered " + inr(num("PROFIT_BEFORE_TAX" + sfx)) + ".");
      const tax = (num("CURRENT_TAX" + sfx) || 0) + (num("DEFERRED_TAX" + sfx) || 0);
      const after = pbt - tax + (num("PL_DISCONTINUED_OPERATIONS" + sfx) || 0) - (num("PL_DISCONTINUED_TAX" + sfx) || 0);
      if (off(after, num("PROFIT_AFTER_TAX" + sfx))) err("PL", "Profit after tax doesn't add up (" + name + ")", "Computed " + inr(after) + ", entered " + inr(num("PROFIT_AFTER_TAX" + sfx)) + ".");
      if (sfx === "_CUR") pat = num("PROFIT_AFTER_TAX_CUR") !== null ? num("PROFIT_AFTER_TAX_CUR") : after;
    }
    const shares = num("PAID_UP_SHARES"), eps = num("EPS_BASIC_CUR");
    if (pat !== null && shares && eps !== null && Math.abs(pat / shares - eps) > Math.max(0.02, Math.abs(eps) * 0.01))
      warn("EPS", "Basic EPS doesn't match profit ÷ shares", inr(pat) + " ÷ " + shares + " = " + (pat / shares).toFixed(2) + ", entered " + eps + " (fine if shares changed during the year).");
    const resPrev = num("RESERVES_SURPLUS_PREV");
    if (pat !== null && res !== null && resPrev !== null && off(res - resPrev, pat))
      warn("RESERVES", "Movement in reserves ≠ profit for the year", "Reserves moved " + inr(res - resPrev) + ", profit is " + inr(pat) + ". Expected only with dividend, premium, or prior-period items.");
    if (off(num("PL_DEPRECIATION_CUR"), num("DEPRECIATION_AMORTIZATION_BS"))) note("DEPRECIATION", "Depreciation in parameters differs from the P&L charge", "Fine if the parameter shows accumulated depreciation.");

    // ── Which form: XBRL thresholds ──
    const paidUp = num("PAID_UP_NOMINAL") !== null ? num("PAID_UP_NOMINAL") : sc;
    if ((paidUp !== null && paidUp >= CFG.xbrl.paidUp) || (turnover !== null && turnover >= CFG.xbrl.turnover))
      err("XBRL", "This company must file AOC-4 XBRL, not AOC-4", "Paid-up capital ≥ ₹5 crore or turnover ≥ ₹100 crore (XBRL Rules 2015).");

    // ── Segment II-IV: products ──
    const cats = num("TOTAL_CATEGORIES") || 0;
    if (cats >= 1) {
      if (blank(d.CATEGORY_CODE) || blank(d.HIGHEST_CODE)) warn("CATEGORY_CODE", "Product/service codes are blank", "ITC/NPCS 4-digit category code and 8-digit product code are mandatory; Phase 7 cannot be saved without them.");
      else {
        if (!/^\d{4}$/.test(String(d.CATEGORY_CODE).trim())) warn("CATEGORY_CODE", "Category code should be 4 digits", String(d.CATEGORY_CODE));
        if (!/^\d{8}$/.test(String(d.HIGHEST_CODE).trim())) warn("HIGHEST_CODE", "Highest-turnover product code should be 8 digits", String(d.HIGHEST_CODE));
      }
      let catTotal = num("CATEGORY_TURNOVER") || 0;
      for (let n = 2; n <= cats; n++) catTotal += num("CATEGORY_" + n + "_TURNOVER") || 0;
      if (turnover !== null && catTotal > turnover + 1) err("CATEGORY_TURNOVER", "Product turnover exceeds revenue from operations", inr(catTotal) + " vs " + inr(turnover) + ".");
      if (num("HIGHEST_TURNOVER") !== null && num("CATEGORY_TURNOVER") !== null && num("HIGHEST_TURNOVER") > num("CATEGORY_TURNOVER") + 1)
        err("HIGHEST_TURNOVER", "Highest product turnover exceeds its category turnover");
    }

    // ── Segments III-VI ──
    if (yes(d.ANY_TRANSACTION) && !(num("FP_PL_RELATED_PARTY_GROSS") > 0)) warn("RPT", "Related-party transactions = Yes but gross value is 0", "P&L parameter 8 (AS-18) should carry the total.");
    if (!yes(d.ANY_TRANSACTION) && num("FP_PL_RELATED_PARTY_GROSS") > 0) warn("RPT", "Related-party value entered but Segment III says No");
    if (/not applicable/i.test(d.CSR_APPLICABILITY || "")) {
      const nwPrev = (num("SHARE_CAPITAL_PREV") || 0) + (num("RESERVES_SURPLUS_PREV") || 0);
      const hit = nwPrev >= CFG.csr.netWorth || (num("TOTAL_INCOME_PREV") || 0) >= CFG.csr.turnover || (num("PROFIT_BEFORE_TAX_PREV") || 0) >= CFG.csr.netProfit;
      if (hit) warn("CSR", "CSR looks applicable but is marked Not applicable", "Sec 135(1) thresholds were crossed in the preceding year; CSR-2 is then a linked form.");
    }
    if ((num("FP_BS_09") || 0) > 0 || (num("BS_UNSEC_LT_DEPOSITS_CUR") || 0) > 0 || (num("BS_UNSEC_ST_DEPOSITS_CUR") || 0) > 0)
      warn("DEPOSITS", "Deposits are reported", "Check Sec 73 compliance and that DPT-3 was filed.");

    return out;
  }

  // Raw MCA / AEM messages → what they mean and what to do. First match wins.
  const EXPLAIN = [
    [/session.*(expired|timed? ?out|invalid)|log ?in again|sign ?in again/i, "MCA signed you out.", "Sign in again on the MCA tab, reopen the saved AOC-4 draft, then click Fill to resume from this phase."],
    [/adt.?1/i, "MCA could not link the ADT-1 SRN to this company.", "Check the SRN is approved and belongs to this CIN; file ADT-1 first if it is missing."],
    [/\bdin\b/i, "A signatory's DIN was not accepted.", "Check the 8-digit DIN, that the director's DIR-3 KYC is active, and that they were a director on the signing date."],
    [/\bpan\b/i, "A PAN was not accepted.", "PAN is 5 letters, 4 digits, 1 letter. For the auditor, use the firm's PAN when the category is Auditor's firm."],
    [/\bdate\b|dd\/mm\/yyyy/i, "MCA rejected a date.", "Dates must be DD/MM/YYYY, not in the future, and on or after the financial year end."],
    [/total.*(asset|liabilit)|not (equal|match|tally)|mismatch/i, "MCA says two totals do not agree.", "Assets must equal equity and liabilities, and each break-up must equal its balance-sheet line. Correct the client figures and refill this phase."],
    [/mandatory|required|cannot be (blank|empty)|please (enter|select|provide|fill)/i, "A mandatory field is empty.", "Fill it in the client data (or on the MCA page) and Save that section again."],
    [/valid|invalid|format|numeric|only numbers|special character/i, "MCA did not accept a value's format.", "Use whole rupees without commas or decimals; codes and numbers without spaces or symbols."],
    [/already (been )?filed|pending for (payment|approval)|duplicate/i, "Another AOC-4 exists for this year.", "Open My Application on MCA: pay, cancel or wait for the pending SRN before filing again."],
    [/xbrl/i, "MCA expects the XBRL form for this company.", "File AOC-4 XBRL with a validated XBRL instance document instead."],
    [/attach|file size|\bmb\b|pdf/i, "MCA rejected an attachment.", "Use PDF, under 10 MB each and 20 MB in total, with a simple file name."],
    [/dsc|digital signature|emsigner|embridge/i, "The digital signature step failed.", "Plug in the DSC token, start emBridge as Administrator, and check the DSC is registered on MCA for this DIN/PAN."],
    [/try again|server|unavailable|timed? ?out|technical/i, "MCA's server did not respond.", "Wait a minute and click Fill again; it resumes from this phase."],
  ];
  function explain(text) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    for (const [re, meaning, fix] of EXPLAIN) if (re.test(raw)) return { raw, meaning, fix };
    return { raw, meaning: "MCA reported a problem with this section.", fix: "Read the red message next to the field on the MCA page, correct it, and Save that section again." };
  }

  const api = { run, explain, CONFIG: CFG };
  root.Aoc4Checks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
