// Central registry — single source of truth for the 5 supported forms.
// Consumed by pills, data card, timeline, filler dispatch and log drawer.

(function (root) {
  "use strict";
  if (root.FORMS) return;

  const DEFAULT_FORM = "aoc4";

  const FORMS = {
    aoc4: {
      value: "aoc4",
      label: "AOC-4",
      shortLabel: "AOC-4",
      description: "Form AOC-4 Online — Financial statements filing",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/><line x1='10' x2='8' y1='9' y2='9'/></svg>",
      filler: "aoc4",
      urlPatterns: [/aoc4_online/i, /aoc4/i],
      phases: [
        { id: "prepare",  label: "Prepare client data" },
        { id: "open",     label: "Open MCA tab" },
        { id: "phase1",   label: "Phase 1 — Part A: General info & signatories" },
        { id: "phase2",   label: "Phase 2 — Subsidiary, auditor & books" },
        { id: "phase3_6", label: "Phases 3-6 — Balance sheet / Parameters / Share capital / P&L" },
        { id: "phase7",   label: "Phase 7 — Products & disclosures" },
      ],
    },
    aoc4_offline: {
      value: "aoc4_offline",
      label: "AOC-4 Offline",
      shortLabel: "AOC-4 Off",
      description: "AOC-4 Offline eForm (v3offline, id-based fill)",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v4a2 2 0 0 0 2 2h4'/><path d='M12 18v-6'/><path d='m9 15 3 3 3-3'/></svg>",
      filler: "aoc4_offline",
      urlPatterns: [/aoc.?4.*offline/i, /aoc4_offline/i],
      phases: [
        { id: "prepare",   label: "Prepare form data" },
        { id: "open",      label: "Open AOC-4 offline PDF form" },
        { id: "general",   label: "Fill General info" },
        { id: "signatory", label: "Fill Signatory / AGM / Auditor" },
        { id: "misc",      label: "Fill Subsidiary / RPT / CSR" },
        { id: "complete",  label: "Highlight & review" },
      ],
    },
    spice_a: {
      value: "spice_a",
      label: "SPICe+ Part A",
      shortLabel: "SPICe+ A",
      description: "Name reservation (SPICe+ Part A) — selector-based fill",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z'/><path d='M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2'/><path d='M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2'/><path d='M10 6h4'/><path d='M10 10h4'/><path d='M10 14h4'/><path d='M10 18h4'/></svg>",
      filler: "spice_a",
      urlPatterns: [/spice.*part.*a/i, /spice_a/i, /nameReservation/i],
      phases: [
        { id: "prepare",  label: "Prepare form data" },
        { id: "open",     label: "Open SPICe+ Part A" },
        { id: "names",    label: "Match proposed names" },
        { id: "type",     label: "Fill company type / class / category" },
        { id: "nic",      label: "Fill NIC / main activity" },
        { id: "complete", label: "Highlight & review" },
      ],
    },
    inc32: {
      value: "inc32",
      label: "INC-32",
      shortLabel: "INC-32",
      description: "SPICe+ Part B (INC-32) — grouped selector fill",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='8' height='4' x='8' y='2' rx='1' ry='1'/><path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><path d='M12 11h4'/><path d='M12 16h4'/><path d='M8 11h.01'/><path d='M8 16h.01'/></svg>",
      filler: "inc32",
      urlPatterns: [/inc.?32/i, /spice.*part.*b/i],
      phases: [
        { id: "prepare",  label: "Prepare form data" },
        { id: "open",     label: "Open SPICe+ Part B" },
        { id: "details",  label: "Fill company details" },
        { id: "names",    label: "Fill proposed names" },
        { id: "nic",      label: "Fill NIC activity / attachments" },
        { id: "complete", label: "Highlight & review" },
      ],
    },
    dir3: {
      value: "dir3",
      label: "DIR-3 KYC",
      shortLabel: "DIR-3",
      description: "Director KYC — DIN, PAN, mobile/email OTP, address",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><polyline points='16 11 18 13 22 9'/></svg>",
      filler: "dir3",
      urlPatterns: [/dir.?3/i, /director.*kyc/i],
      phases: [
        { id: "prepare",  label: "Prepare form data" },
        { id: "open",     label: "Open DIR-3 KYC" },
        { id: "identity", label: "Fill DIN / PAN / name" },
        { id: "otp",      label: "Mobile / Email OTP block" },
        { id: "address",  label: "Address & nationality" },
        { id: "complete", label: "Highlight & review" },
      ],
    },
    mgt7: {
      value: "mgt7",
      label: "MGT-7",
      shortLabel: "MGT-7",
      description: "Annual Return — all sections; first row only of repeating tables (beta)",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'/><polyline points='14 2 14 8 20 8'/><line x1='16' x2='8' y1='13' y2='13'/><line x1='16' x2='8' y1='17' y2='17'/></svg>",
      filler: "mgt7",
      urlPatterns: [/form-mgt7/i, /mgt.?7/i],
      phases: [
        { id: "prepare",      label: "Prepare form data" },
        { id: "open",         label: "Open MGT-7 (Company Details)" },
        { id: "registration", label: "Fill CIN / FY / class / category" },
        { id: "agm",          label: "Fill AGM details" },
        { id: "later",        label: "Fill the remaining sections of the open step" },
        { id: "complete",     label: "Highlight & review" },
      ],
    },
    adt1: {
      value: "adt1",
      label: "ADT-1",
      shortLabel: "ADT-1",
      description: "Notice to Registrar for appointment of auditor (beta)",
      iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 12l2 2 4-4'/><path d='M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z'/></svg>",
      filler: "adt1",
      urlPatterns: [/adt.?1/i, /adt-1/i],
      phases: [
        { id: "prepare",     label: "Prepare form data" },
        { id: "open",        label: "Open ADT-1" },
        { id: "company",     label: "Fill company info" },
        { id: "appointment", label: "Fill appointment / auditor details" },
        { id: "complete",    label: "Highlight & review" },
      ],
    },
  };

  // Not a filing: a clean-up tool for the draft SRNs left in "Pending for Action" after testing.
  FORMS.cancel_srn = {
    value: "cancel_srn",
    label: "Cancel pending SRNs",
    shortLabel: "Cancel SRNs",
    description: "Bulk-cancels draft (Pending for Action) SRNs on MCA's My Application page",
    iconSvg: "<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 6h18'/><path d='M8 6V4h8v2'/><path d='M6 6l1 14h10l1-14'/></svg>",
    filler: "none",
    urlPatterns: [/application-history/i],
    phases: [
      { id: "scan",   label: "Scan the pending list" },
      { id: "cancel", label: "Cancel the drafts" },
    ],
  };

  const FORM_ORDER = ["aoc4", "aoc4_offline", "spice_a", "inc32", "dir3", "mgt7", "adt1", "cancel_srn"];

  function expectedFieldsFor(formType) {
    if (typeof root === "undefined") return 0;
    switch (formType) {
      case "aoc4":
        return root.AOC4_EXPECTED_FIELDS || (root.AOC4_FIELDS || []).length || 26;
      case "aoc4_offline":
        return root.AOC4_OFFLINE_EXPECTED_FIELDS || (root.AOC4_OFFLINE_FIELDS || []).length || 58;
      case "spice_a":
        return root.SPICE_PART_A_EXPECTED_FIELDS || (root.SPICE_PART_A_FIELDS || []).length || 17;
      case "inc32":
        return root.INC32_EXPECTED_FIELDS || (root.INC32_FIELDS || []).length || 25;
      case "dir3":
        return root.DIR3_EXPECTED_FIELDS || (root.DIR3_FIELDS || []).length || 15;
      case "mgt7":
        return root.MGT7_EXPECTED_FIELDS || (root.MGT7_FIELDS || []).length || 19;
      case "adt1":
        return root.ADT1_EXPECTED_FIELDS || (root.ADT1_FIELDS || []).length || 55;
      default:
        return 0;
    }
  }

  function categoriesFor(formType) {
    switch (formType) {
      case "aoc4":          return root.AOC4_CATEGORIES || [];
      case "aoc4_offline":  return root.AOC4_OFFLINE_CATEGORIES || [];
      case "spice_a":       return [{ id: "all", label: "SPICe+ Part A", fields: root.SPICE_PART_A_FIELDS || [] }];
      case "inc32":         return root.INC32_CATEGORIES || [];
      case "dir3":          return root.DIR3_CATEGORIES || [];
      case "mgt7":          return root.MGT7_CATEGORIES || [];
      case "adt1":          return root.ADT1_CATEGORIES || [];
      default:              return [];
    }
  }

  function fieldsFor(formType) {
    switch (formType) {
      case "aoc4":          return root.AOC4_FIELDS || [];
      case "aoc4_offline":  return root.AOC4_OFFLINE_FIELDS || [];
      case "spice_a":       return root.SPICE_PART_A_FIELDS || [];
      case "inc32":         return root.INC32_FIELDS || [];
      case "dir3":          return root.DIR3_FIELDS || [];
      case "mgt7":          return root.MGT7_FIELDS || [];
      case "adt1":          return root.ADT1_FIELDS || [];
      default:              return [];
    }
  }

  function getActiveForm() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(["currentForm"], function (res) {
          resolve((res && res.currentForm) || DEFAULT_FORM);
        });
      } catch (_) {
        resolve(DEFAULT_FORM);
      }
    });
  }

  function setActiveForm(formType) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.set({ currentForm: formType || DEFAULT_FORM }, resolve);
      } catch (_) {
        resolve();
      }
    });
  }

  root.FORMS = FORMS;
  root.FORM_ORDER = FORM_ORDER;
  root.FORMS_REGISTRY = {
    DEFAULT_FORM: DEFAULT_FORM,
    FORMS: FORMS,
    FORM_ORDER: FORM_ORDER,
    expectedFieldsFor: expectedFieldsFor,
    categoriesFor: categoriesFor,
    fieldsFor: fieldsFor,
    getActiveForm: getActiveForm,
    setActiveForm: setActiveForm,
  };
})(typeof window !== "undefined" ? window : globalThis);
