// MGT-7 / MGT-7A pre-filing compliance checks.
//
// MGT-7 is an STP form: once filed there is no resubmission, so a wrong figure costs a revised
// return (or worse, a Sec 92 / Sec 173 exposure nobody noticed). These checks run on the client
// data BEFORE the extension touches the MCA page. Pure logic — no DOM, no chrome.* — so it also
// runs under Node for testing.
//
//   Mgt7Checks.run(data, { today: Date, aoc4: { turnover, netWorth, paidUpCapital } })
//     → { errors: [...], warnings: [...], info: [...], variant: "MGT-7" | "MGT-7A" | null,
//         deadline: { dueDate, feeFreeUntil, daysLate, additionalFee } | null }
//   Each item is { key, title, detail }.
//
// `data` is the flat Section I / AGM formData the filler uses (cin, finYearFrom, agmDate, ...).
// The deeper sections (shareCapital, shareholdingPattern, meetings, remuneration,
// turnoverAndNetWorth, declaration) are optional and are read from data itself, data.sections
// or data.referenceOnly — the shape the bundled client files already use.
//
// Statutory figures below are configuration, not code: update them when MCA changes them.

(function (root) {
  "use strict";

  const CFG = {
    // Fee-free windows granted by MCA circulars, keyed by financial-year end (YYYY-MM-DD).
    // FY 2025-26: General Circular 05/2026 — MGT-7 / MGT-7A without additional fee till 31/01/2027.
    // Filing after the window: additional fee counts from the ORIGINAL statutory due date.
    // FY 2024-25: MCA relaxation — AOC-4 / MGT-7 without additional fee till 31/01/2026.
    feeFreeUntil: { "2025-03-31": "31/01/2026", "2026-03-31": "31/01/2027" },
    additionalFeePerDay: 100, // Companies (Registration Offices and Fees) Rules — ₹100/day, no cap
    // Small company limits (Sec 2(85) + Rule 2(1)(t)). Revised w.e.f. 01/12/2025.
    smallCompany: [
      { fromFyEnd: "2025-12-01", paidUp: 10e7, turnover: 100e7 },
      { fromFyEnd: "0000-01-01", paidUp: 4e7, turnover: 40e7, note: "Pre-Dec-2025 limits; MCA guidance for FY 2024-25 is mixed — confirm which form MCA's own validation demands." },
    ],
    // Normal filing fee by nominal (authorised) share capital, ₹.
    normalFee: [[1e5, 200], [5e5, 300], [25e5, 400], [1e7, 500], [Infinity, 600]],
  };

  const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
  const DIN_RE = /^\d{8}$/;
  const DAY = 86400000;

  // ── helpers ──────────────────────────────────────────────────────────
  function parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s) ? null : new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const str = String(s).trim();
    let m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return valid(+m[3], +m[2], +m[1]);
    m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return valid(+m[1], +m[2], +m[3]);
    return null;
    function valid(y, mo, d) {
      const dt = new Date(y, mo - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
    }
  }
  const fmt = d => d ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() : "";
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const addMonths = (d, n) => { const r = new Date(d.getFullYear(), d.getMonth() + n + 1, 0); return r.getDate() < d.getDate() ? r : new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); };
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  const num = v => { if (v === null || v === undefined || v === "") return null; const n = Number(String(v).replace(/[,\s₹]/g, "")); return isFinite(n) ? n : null; };
  const yes = v => /^y(es)?$/i.test(String(v || "").trim());
  const no = v => /^no?$/i.test(String(v || "").trim());
  const blank = v => v === undefined || v === null || String(v).trim() === "";
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.5 : tol);

  function section(data, name) {
    return (data && data[name]) || (data && data.sections && data.sections[name]) || (data && data.referenceOnly && data.referenceOnly[name]) || null;
  }

  // ── main ─────────────────────────────────────────────────────────────
  function run(data, opts) {
    opts = opts || {};
    data = data || {};
    const today = parseDate(opts.today || new Date());
    const out = { errors: [], warnings: [], info: [], variant: null, deadline: null };
    const err = (key, title, detail) => out.errors.push({ key, title, detail: detail || "" });
    const warn = (key, title, detail) => out.warnings.push({ key, title, detail: detail || "" });
    const note = (key, title, detail) => out.info.push({ key, title, detail: detail || "" });

    // ── Section I: identity ──
    const cin = String(data.cin || data.CIN || "").trim().toUpperCase();
    const cinType = CIN_RE.test(cin) ? cin.slice(12, 15) : null; // PTC / PLC / OPC / ...
    const isOpc = cinType === "OPC" || /one person/i.test(data.companyClass || "");
    const isPrivate = cinType === "PTC" || cinType === "OPC" || /private/i.test(data.companyClass || "");
    if (!cin) err("cin", "CIN is missing");
    else if (!CIN_RE.test(cin)) err("cin", "CIN format is wrong", cin + " — expected 21 characters like U74999MH2010PTC123456.");
    if (cinType === "PTC" && data.companyClass && !/private/i.test(data.companyClass))
      warn("companyClass", "Class doesn't match the CIN", "CIN says private (PTC) but class is \"" + data.companyClass + "\".");
    if (cinType === "PLC" && data.companyClass && /private/i.test(data.companyClass))
      warn("companyClass", "Class doesn't match the CIN", "CIN says public (PLC) but class is \"" + data.companyClass + "\". Check for a conversion during the year.");

    const pan = String(data.companyPan || "").trim().toUpperCase();
    if (!pan) err("companyPan", "Company PAN is missing");
    else if (!PAN_RE.test(pan)) err("companyPan", "Company PAN format is wrong", pan);
    else if (pan[3] !== "C") warn("companyPan", "PAN is not a company PAN", "4th character is \"" + pan[3] + "\"; a company PAN has \"C\". Is this a director's PAN by mistake?");

    if (blank(data.companyEmail)) err("companyEmail", "Company e-mail is missing");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.companyEmail)) err("companyEmail", "Company e-mail format is wrong", data.companyEmail);
    if (blank(data.companyPhone)) err("companyPhone", "Company telephone is missing");
    else if (!/^\d{10,15}$/.test(String(data.companyPhone).replace(/[\s\-+()]/g, ""))) warn("companyPhone", "Telephone looks wrong", "Expected 10–15 digits with STD code.");

    if (!/^(original|revised)$/i.test(String(data.filingType || "").trim()))
      err("filingType", "Type of filing must be Original or Revised");

    const fyFrom = parseDate(data.finYearFrom), fyTo = parseDate(data.finYearTo);
    const doi = parseDate(data.dateOfIncorporation);
    if (!fyFrom || !fyTo) err("finYear", "Financial year dates missing or invalid", "Use DD/MM/YYYY.");
    else {
      if (fyTo <= fyFrom) err("finYear", "Financial year To is not after From");
      const months = (fyTo.getFullYear() - fyFrom.getFullYear()) * 12 + fyTo.getMonth() - fyFrom.getMonth() + 1;
      if (months > 15) err("finYear", "Financial year is longer than allowed", months + " months; Sec 2(41) allows a first FY up to 15 months, otherwise 12.");
      else if (!(fyTo.getDate() === 31 && fyTo.getMonth() === 2))
        warn("finYear", "Financial year does not end on 31 March", "Allowed only with Tribunal approval (Sec 2(41) proviso).");
      if (today && fyTo > today) err("finYear", "Financial year has not ended yet", "FY ends " + fmt(fyTo) + ".");
    }
    if (blank(data.dateOfIncorporation)) err("dateOfIncorporation", "Date of incorporation is missing");
    else if (!doi) err("dateOfIncorporation", "Date of incorporation is invalid");
    else if (fyTo && doi > fyTo) err("dateOfIncorporation", "Company was incorporated after this FY ended");
    const firstFy = !!(doi && fyFrom && doi >= fyFrom);

    if (/limited by shares/i.test(data.companyCategory || "") && no(data.hasShareCapital))
      err("hasShareCapital", "\"Has share capital\" is No for a company limited by shares");
    if (blank(data.companyClass) || blank(data.companyCategory) || blank(data.companySubCategory))
      err("companyClass", "Class / category / sub-category incomplete");

    // ── AGM ──
    const agmDate = parseDate(data.agmDate), agmDue = parseDate(data.agmDueDate), agmExt = parseDate(data.agmExtendedDueDate);
    if (fyTo && !isOpc) {
      // First AGM: within 9 months of first FY end. Later AGMs: within 6 months of FY end.
      const expectedDue = addMonths(fyTo, firstFy ? 9 : 6);
      if (!agmDue) err("agmDueDate", "Due date of AGM is missing", "Expected " + fmt(expectedDue) + ".");
      else if (iso(agmDue) !== iso(expectedDue))
        warn("agmDueDate", "Due date of AGM looks wrong", "Entered " + fmt(agmDue) + "; Sec 96 gives " + fmt(expectedDue) + (firstFy ? " (first AGM, 9 months)." : " (6 months from FY end)."));
    }
    if (isOpc) note("agm", "OPC — AGM not required", "Sec 96(1) exempts One Person Companies; answer the AGM questions accordingly.");

    const extGranted = yes(data.agmExtensionGranted);
    if (extGranted) {
      if (blank(data.gnl1Srn)) err("gnl1Srn", "GNL-1 SRN missing", "AGM extension is marked granted — the SRN of the approved GNL-1 is required.");
      if (!agmExt) err("agmExtendedDueDate", "Extended AGM due date missing");
      else if (agmDue && agmExt > addMonths(agmDue, 3)) err("agmExtendedDueDate", "Extension is more than 3 months", "Sec 96(1) allows the ROC to extend by up to 3 months only.");
      if (firstFy) warn("agmExtensionGranted", "Extension marked for a first AGM", "The ROC cannot extend the first AGM (Sec 96(1) proviso).");
    }
    const effectiveAgmDue = extGranted && agmExt ? agmExt : agmDue;

    if (yes(data.agmHeld)) {
      if (!agmDate) err("agmDate", "AGM is marked held but its date is missing");
      else {
        if (fyTo && agmDate <= fyTo) err("agmDate", "AGM date is on/before FY end", "The AGM adopting these accounts must be after " + fmt(fyTo) + ".");
        if (today && agmDate > today) err("agmDate", "AGM date is in the future");
        if (effectiveAgmDue && agmDate > effectiveAgmDue)
          warn("agmDate", "AGM was held late", fmt(agmDate) + " is after the due date " + fmt(effectiveAgmDue) + ". Sec 99 default — disclose it in the penalty / compounding section and consider compounding.");
      }
    } else if (no(data.agmHeld)) {
      if (blank(data.agmNotHeldReason)) err("agmNotHeldReason", "Reason for not holding AGM is required");
      if (!isOpc) warn("agmHeld", "AGM not held", "Sec 96 default unless an extension covers it; the return is still due within 60 days of the date the AGM should have been held.");
    } else if (!isOpc) err("agmHeld", "\"Whether AGM held\" must be Yes or No");

    // ── Deadline & fee ──
    const base = yes(data.agmHeld) && agmDate ? agmDate : effectiveAgmDue;
    if (base && today) {
      const due = addDays(base, 60); // Sec 92(4)
      const window = fyTo && CFG.feeFreeUntil[iso(fyTo)] ? parseDate(CFG.feeFreeUntil[iso(fyTo)]) : null;
      const lastFree = window && window > due ? window : due;
      const daysLate = today > lastFree ? daysBetween(due, today) : 0; // fee counts from ORIGINAL due date
      out.deadline = { dueDate: fmt(due), feeFreeUntil: fmt(lastFree), daysLate, additionalFee: daysLate * CFG.additionalFeePerDay };
      if (daysLate > 0)
        warn("deadline", "Filing is late — additional fee " + inr(daysLate * CFG.additionalFeePerDay),
          daysLate + " days × " + inr(CFG.additionalFeePerDay) + " counted from the statutory due date " + fmt(due) + (window ? " (the fee-free window ended " + fmt(window) + ")." : "."));
      else {
        const left = daysBetween(today, lastFree);
        (left <= 15 ? warn : note)("deadline", "File by " + fmt(lastFree) + " — " + left + " day" + (left === 1 ? "" : "s") + " left",
          window && window > due ? "Statutory due date " + fmt(due) + "; MCA's relaxation waives the additional fee until " + fmt(window) + "." : "Sec 92(4): 60 days from the AGM.");
      }
    }

    // ── Which form: MGT-7 or MGT-7A ──
    const sc = section(data, "shareCapital");
    const tn = section(data, "turnoverAndNetWorth");
    const paidUp = num(data.paidUpCapital) ?? (sc && sc.equity ? (num(sc.equity.amountPaidUp) || 0) + (num(sc.preference && sc.preference.amountPaidUp) || 0) : null);
    const turnover = num(data.turnoverPrevFY) ?? num(tn && tn.turnover);
    if (isOpc) {
      out.variant = "MGT-7A";
      note("variant", "File MGT-7A, not MGT-7", "One Person Company — Rule 11(1) prescribes MGT-7A.");
    } else if (fyTo && paidUp !== null && turnover !== null) {
      const lim = CFG.smallCompany.find(l => iso(fyTo) >= l.fromFyEnd);
      const excluded = isPrivate === false || yes(data.isHoldingOrSubsidiary) || yes(data.isSection8) || /public/i.test(data.companyClass || "");
      const small = !excluded && paidUp <= lim.paidUp && turnover <= lim.turnover;
      out.variant = small ? "MGT-7A" : "MGT-7";
      if (small)
        warn("variant", "This looks like a small company — file MGT-7A, not MGT-7",
          "Paid-up " + inr(paidUp) + " ≤ " + inr(lim.paidUp) + " and turnover " + inr(turnover) + " ≤ " + inr(lim.turnover) + ". Not valid if it is a holding/subsidiary, Sec 8 or special-Act company — set isHoldingOrSubsidiary / isSection8 to \"Yes\" if so." + (lim.note ? " " + lim.note : "") +
          (num(data.turnoverPrevFY) === null ? " (Turnover test uses the preceding FY; this check used the FY's own turnover — add turnoverPrevFY to be exact.)" : ""));
      else note("variant", "Form MGT-7 applies", excluded ? "Public / holding / subsidiary / Sec 8 company." : "Above the small-company limits.");
    } else {
      note("variant", "Can't tell MGT-7 vs MGT-7A yet", "Add paid-up capital and turnover (shareCapital / turnoverAndNetWorth) to check the small-company test.");
    }

    // ── Normal filing fee ──
    const authorised = num(data.authorisedCapital) ?? (sc && sc.equity ? (num(sc.equity.amountAuthorized) || 0) + (num(sc.preference && sc.preference.amountAuthorized) || 0) : null);
    if (authorised !== null && yes(data.hasShareCapital)) {
      const fee = CFG.normalFee.find(([upto]) => authorised < upto)[1];
      note("fee", "Normal filing fee about " + inr(fee), "Based on authorised capital " + inr(authorised) + ". MCA computes the final fee at payment.");
    }

    // ── Share capital ──
    if (sc && sc.equity) {
      const e = sc.equity;
      const chain = [["authorized", "issued"], ["issued", "subscribed"], ["subscribed", "paidUp"]];
      for (const [a, b] of chain)
        if (num(e[a]) !== null && num(e[b]) !== null && num(e[b]) > num(e[a]))
          err("shareCapital", "Equity " + b + " shares exceed " + a, e[b] + " > " + e[a]);
      const fv = num(e.nominalValuePerShare);
      if (fv) for (const k of ["Authorized", "Issued", "Subscribed", "PaidUp"]) {
        const shares = num(e[k[0].toLowerCase() + k.slice(1)]), amt = num(e["amount" + k]);
        if (shares !== null && amt !== null && !near(shares * fv, amt, 1))
          err("shareCapital", "Equity " + k + " amount ≠ shares × face value", shares + " × " + fv + " = " + inr(shares * fv) + ", entered " + inr(amt));
      }
      const br = sc.breakupEquity;
      if (br && [br.beginningShares, br.endShares].every(v => num(v) !== null)) {
        const calc = num(br.beginningShares) + (num(br.increaseDuringYear) || 0) - (num(br.decreaseDuringYear) || 0);
        if (!near(calc, num(br.endShares))) err("shareCapital", "Share movement doesn't add up", "Opening " + br.beginningShares + " + increase − decrease = " + calc + ", closing says " + br.endShares + ".");
        if (num(e.paidUp) !== null && !near(num(br.endShares), num(e.paidUp))) err("shareCapital", "Closing shares ≠ paid-up shares", br.endShares + " vs " + e.paidUp);
        if ((num(br.increaseDuringYear) || 0) > 0) note("shareCapital", "Shares were allotted this year", "Check PAS-3 was filed for each allotment and SH-7 for any increase in authorised capital.");
      }
    }

    // ── Shareholding pattern & members ──
    const sp = section(data, "shareholdingPattern");
    if (sp) {
      const pr = sp.promoters || {}, ot = sp.otherThanPromoters || {};
      const pct = (num(pr.equityPercent) || 0) + (num(ot.equityPercent) || 0);
      if (!near(pct, 100, 0.05)) err("shareholding", "Equity shareholding doesn't total 100%", "Promoters " + (pr.equityPercent || 0) + "% + others " + (ot.equityPercent || 0) + "% = " + pct + "%.");
      const held = (num(pr.equityShares) || 0) + (num(ot.equityShares) || 0);
      if (sc && sc.equity && num(sc.equity.paidUp) !== null && !near(held, num(sc.equity.paidUp)))
        err("shareholding", "Shares in shareholding pattern ≠ paid-up shares", held + " vs " + sc.equity.paidUp + ".");
      const total = num(sp.totalShareholders);
      if (total !== null) {
        const parts = (num(pr.totalShareholders) || 0) + (num(ot.totalShareholders) || 0);
        if (parts && !near(parts, total)) err("shareholding", "Shareholder count mismatch", "Promoters + others = " + parts + ", total says " + total + ".");
        const b = sp.breakup;
        if (b) {
          const bs = (num(b.individualFemale) || 0) + (num(b.individualMale) || 0) + (num(b.individualTransgender) || 0) + (num(b.otherThanIndividuals) || 0);
          if (!near(bs, total)) err("shareholding", "Shareholder break-up mismatch", "Female + male + transgender + non-individual = " + bs + ", total says " + total + ".");
        }
        if (isOpc && total !== 1) err("members", "OPC must have exactly one member", total + " shown.");
        else if (isPrivate && !isOpc && total > 200) err("members", "Private company over 200 members", "Sec 2(68) limit breached.");
        else if (isPrivate && !isOpc && total < 2) err("members", "Private company below 2 members", "Sec 3(1)(b) minimum is 2.");
        else if (!isPrivate && cinType && total < 7) err("members", "Public company below 7 members", "Sec 3(1)(a) minimum is 7.");
      }
    }

    // ── Board meetings (Sec 173) ──
    const mt = section(data, "meetings");
    if (mt && Array.isArray(mt.boardMeetings)) {
      const dates = mt.boardMeetings.map(m => parseDate(m.date)).filter(Boolean).sort((a, b) => a - b);
      if (num(mt.boardMeetingsHeld) !== null && num(mt.boardMeetingsHeld) !== mt.boardMeetings.length)
        err("meetings", "Board meeting count mismatch", "Says " + mt.boardMeetingsHeld + ", lists " + mt.boardMeetings.length + ".");
      if (fyFrom && fyTo) for (const d of dates) if (d < fyFrom || d > fyTo) err("meetings", "Board meeting outside the FY", fmt(d));
      const relaxed = isOpc || out.variant === "MGT-7A"; // small / OPC: Sec 173(5)
      const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
      if (relaxed) {
        // Sec 173(5): at least one meeting in each half of the calendar year, gap ≥ 90 days.
        // Only halves lying wholly inside this FY can be judged from this FY's meetings; a half that
        // straddles the FY boundary (Jan–Jun for an April FY) may have its meeting in the other FY.
        const halves = new Set(dates.map(d => d.getFullYear() + "-" + (d.getMonth() < 6 ? "H1" : "H2")));
        const start = firstFy && doi ? doi : fyFrom;
        if (start && fyTo) for (let y = start.getFullYear(); y <= fyTo.getFullYear(); y++) for (const h of ["H1", "H2"]) {
          const hFrom = new Date(y, h === "H1" ? 0 : 6, 1), hTo = new Date(y, h === "H1" ? 5 : 11, h === "H1" ? 30 : 31);
          if (hFrom >= start && hTo <= fyTo && !halves.has(y + "-" + h))
            warn("meetings", "No board meeting in " + (h === "H1" ? "Jan–Jun " : "Jul–Dec ") + y, "Sec 173(5) needs one per half calendar year — disclose as non-compliance if true.");
        }
        gaps.forEach((g, i) => { if (g < 90) warn("meetings", "Board meetings only " + g + " days apart", fmt(dates[i]) + " → " + fmt(dates[i + 1]) + "; Sec 173(5) needs ≥ 90 days."); });
      } else if (out.variant === "MGT-7") { // size unknown → don't guess which Sec 173 rule applies
        if (dates.length < 4) warn("meetings", "Only " + dates.length + " board meeting(s)", "Sec 173(1) needs at least 4 a year — disclose as non-compliance if true.");
        gaps.forEach((g, i) => { if (g > 120) warn("meetings", "Gap of " + g + " days between board meetings", fmt(dates[i]) + " → " + fmt(dates[i + 1]) + "; Sec 173(1) allows at most 120."); });
      }
      for (const m of mt.boardMeetings) {
        const a = num(m.directorsAssociated), t = num(m.directorsAttended), p = num(m.percentAttendance);
        if (a && t !== null && p !== null && !near(t / a * 100, p, 0.1)) err("meetings", "Attendance % wrong for " + m.date, t + "/" + a + " = " + (t / a * 100).toFixed(2) + "%, entered " + p + "%.");
        if (a && t !== null && t > a) err("meetings", "More directors attended than associated on " + m.date);
      }
      for (const d of mt.directorAttendance || []) {
        if (d.din && !DIN_RE.test(String(d.din))) err("meetings", "Invalid DIN in attendance", d.name + ": " + d.din);
        const e = num(d.meetingsEntitled), at = num(d.meetingsAttended), p = num(d.percentAttendance);
        if (e && at !== null && p !== null && !near(at / e * 100, p, 0.1)) err("meetings", "Attendance % wrong for " + d.name, at + "/" + e + " = " + (at / e * 100).toFixed(2) + "%, entered " + p + "%.");
        if (e && at === 0) warn("meetings", d.name + " attended no board meetings", "If absent from all meetings for 12 months, office is vacated under Sec 167(1)(b).");
      }
    }

    // ── Remuneration ──
    const rm = section(data, "remuneration");
    if (rm) {
      let sum = 0;
      for (const list of [rm.managingDirectors, rm.otherDirectors, rm.kmp]) for (const r of list || []) {
        const parts = ["grossSalary", "commission", "stockOptionSweatEquity", "others"].reduce((s, k) => s + (num(r[k]) || 0), 0);
        if (num(r.total) !== null && !near(parts, num(r.total))) err("remuneration", "Remuneration total wrong for " + r.name, "Components add to " + inr(parts) + ", total says " + inr(num(r.total)) + ".");
        sum += num(r.total) || parts;
      }
      if (num(rm.totalRemuneration) !== null && sum && !near(sum, num(rm.totalRemuneration)))
        err("remuneration", "Total remuneration mismatch", "Rows add to " + inr(sum) + ", total says " + inr(num(rm.totalRemuneration)) + ".");
    }

    // ── Cross-check with the AOC-4 already filed ──
    const a4 = opts.aoc4;
    if (a4 && tn) {
      if (num(a4.turnover) !== null && num(tn.turnover) !== null && !near(num(a4.turnover), num(tn.turnover), 1))
        err("aoc4", "Turnover differs from AOC-4", "MGT-7 " + inr(num(tn.turnover)) + " vs AOC-4 " + inr(num(a4.turnover)) + ".");
      if (num(a4.netWorth) !== null && num(tn.netWorth) !== null && !near(num(a4.netWorth), num(tn.netWorth), 1))
        err("aoc4", "Net worth differs from AOC-4", "MGT-7 " + inr(num(tn.netWorth)) + " vs AOC-4 " + inr(num(a4.netWorth)) + ".");
      if (num(a4.paidUpCapital) !== null && paidUp !== null && !near(num(a4.paidUpCapital), paidUp, 1))
        err("aoc4", "Paid-up capital differs from AOC-4", inr(paidUp) + " vs " + inr(num(a4.paidUpCapital)) + ".");
    } else if (!a4) {
      note("aoc4", "File AOC-4 first", "Turnover, net worth and company-size flags in MGT-7 should match the AOC-4 for the same year.");
    }

    // ── Declaration ──
    const dc = section(data, "declaration");
    if (dc) {
      const id = String(dc.designatedPersonDinOrPan || "").trim().toUpperCase();
      if (id && !DIN_RE.test(id) && !PAN_RE.test(id)) err("declaration", "Designated person's DIN/PAN is invalid", id);
      const br = parseDate(dc.boardResolutionDate);
      if (blank(dc.boardResolutionNumber) || !br) err("declaration", "Board resolution number/date missing", "Needed for the authorisation in the declaration.");
      else if (fyTo && br <= fyTo) warn("declaration", "Authorising resolution is dated within the FY", "Usually passed after FY end; check it is the right resolution.");
    }

    // ── Data flagged as uncertain by whoever prepared it ──
    for (const k of data.uncertainFields || []) warn("uncertain", "Verify \"" + k + "\" by hand", "Marked uncertain in the source data.");

    return out;
  }

  const api = { run, CONFIG: CFG, _parseDate: parseDate };
  root.Mgt7Checks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
