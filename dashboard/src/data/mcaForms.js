/**
 * MCA Forms Registry — Real field schemas sourced from the Germin8 Chrome Extension
 * field-maps (adt1.js, aoc4.js, aoc4-offline.js, mgt7.js, dir3.js, spice-a.js, inc32.js).
 * Each form has: code, name, sections[], each section has fields[].
 * Field types: 'text' | 'date' | 'select' | 'radio' | 'textarea' | 'number'
 */

export const MCA_FORMS = [
  // ─── 1. AOC-4 (Financial Statements Filing — Online) ────────────────────────
  {
    code: 'AOC-4',
    name: 'Financial Statements Filing',
    shortLabel: 'AOC-4',
    desc: "Annual filing of audited financial statements including Balance Sheet, P&L, Auditor's Report & Board's Report with MCA V3.",
    category: 'Annual Financials',
    dueDate: '30 days after AGM',
    penalty: '₹100 per day of delay',
    color: '#000',
    sections: [
      {
        id: 'general_info',
        label: 'General Information',
        icon: 'Building2',
        fields: [
          { key: 'cin', label: 'Corporate Identity Number (CIN)', type: 'text', required: true, placeholder: 'e.g. U12345MH2020PTC123456', hint: 'Auto-verified against MCA V3 registry' },
          { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Company name as registered with MCA', readOnly: true, hint: 'Auto-populated on CIN lookup' },
          { key: 'authorisedCapital', label: 'Authorised Capital (₹)', type: 'text', required: false, placeholder: '25,00,000' },
          { key: 'numberOfMembers', label: 'Number of Members', type: 'number', required: false, placeholder: '2' },
          { key: 'financialYearFrom', label: 'Financial Year From', type: 'date', required: true },
          { key: 'financialYearTo', label: 'Financial Year To', type: 'date', required: true },
          { key: 'boardMeetingDateFS', label: 'Board Meeting Date (Financial Statements Approved)', type: 'date', required: true },
          { key: 'natureOfFS', label: 'Nature of Financial Statements', type: 'select', required: true,
            options: ['Adopted Financial statements', 'Provisional Financial statements', 'Financial statements not adopted'] },
          { key: 'provisionalFSFiled', label: 'Whether provisional FS already filed?', type: 'select', required: false, options: ['Yes', 'No'] },
          { key: 'adoptedInAdjournedAGM', label: 'Whether adopted in adjourned AGM?', type: 'select', required: false, options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'signatory',
        label: 'Signatory Details',
        icon: 'User',
        fields: [
          { key: 'director1DIN', label: 'Director 1 — DIN / PAN', type: 'text', required: true, placeholder: '08765432' },
          { key: 'director1Name', label: 'Director 1 — Full Name', type: 'text', required: true, placeholder: 'Full name as per DIN' },
          { key: 'director1Designation', label: 'Director 1 — Designation', type: 'select', required: true,
            options: ['Director', 'Managing Director', 'Whole-time Director', 'CEO', 'CFO', 'Company Secretary'] },
          { key: 'director1DateFS', label: 'Director 1 — Signing Date (FS)', type: 'date', required: true },
          { key: 'director2DIN', label: 'Director 2 — DIN / PAN', type: 'text', required: false, placeholder: '09123456' },
          { key: 'director2Name', label: 'Director 2 — Full Name', type: 'text', required: false, placeholder: 'Full name as per DIN' },
          { key: 'director2Designation', label: 'Director 2 — Designation', type: 'select', required: false,
            options: ['Director', 'Managing Director', 'Whole-time Director', 'CEO', 'CFO', 'Company Secretary'] },
          { key: 'boardMeetingDateBR', label: "Board Meeting Date (Board's Report Approved)", type: 'date', required: true },
          { key: 'director1DateBR', label: "Director 1 — Signing Date (Board's Report)", type: 'date', required: true },
        ],
      },
      {
        id: 'agm_details',
        label: 'AGM Details',
        icon: 'Calendar',
        fields: [
          { key: 'agmHeld', label: 'Whether AGM was held', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'agmDate', label: 'Date of AGM', type: 'date', required: true },
          { key: 'agmDueDate', label: 'Due Date of AGM', type: 'date', required: true },
          { key: 'agmExtensionGranted', label: 'Extension for AGM granted by RoC', type: 'select', required: false, options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'auditor',
        label: 'Auditor Details',
        icon: 'Shield',
        fields: [
          { key: 'auditorCategory', label: 'Category of Auditor', type: 'select', required: true,
            options: ["Auditor's Firm", 'Individual Auditor'] },
          { key: 'firmRegistrationNumber', label: 'Auditor Firm Registration Number (FRN)', type: 'text', required: true, placeholder: '102934W' },
          { key: 'auditorName', label: "Auditor's Name / Firm Name", type: 'text', required: true, placeholder: 'Auditor firm name' },
          { key: 'auditorAddress', label: "Auditor's Registered Office Address", type: 'text', required: false, placeholder: '12 CA Street, Fort, Mumbai 400001' },
          { key: 'auditorPan', label: "Auditor's PAN", type: 'text', required: true, placeholder: 'AAAFA1234K' },
          { key: 'membershipNumber', label: 'Membership Number of Signing Auditor', type: 'text', required: true, placeholder: '102934' },
          { key: 'auditorReportDate', label: "Auditor's Report Date", type: 'date', required: true },
        ],
      },
      {
        id: 'financials',
        label: 'Balance Sheet & P&L',
        icon: 'TrendingUp',
        fields: [
          { key: 'shareCapital', label: 'Paid-up Equity Share Capital (₹)', type: 'text', required: true, placeholder: '10,00,000' },
          { key: 'reservesSurplus', label: 'Reserves and Surplus (₹)', type: 'text', required: true, placeholder: '4,50,000' },
          { key: 'nonCurrentLiabilities', label: 'Long-term Borrowings / Liabilities (₹)', type: 'text', required: false, placeholder: '2,00,000' },
          { key: 'currentLiabilities', label: 'Short-term Borrowings / Payables (₹)', type: 'text', required: false, placeholder: '1,50,000' },
          { key: 'totalEquityLiabilities', label: 'Total Equity & Liabilities (₹)', type: 'text', required: true, placeholder: '18,00,000', readOnly: true },
          { key: 'fixedAssets', label: 'Property, Plant & Equipment (₹)', type: 'text', required: true, placeholder: '8,00,000' },
          { key: 'currentAssets', label: 'Current Assets / Cash / Inventories (₹)', type: 'text', required: true, placeholder: '10,00,000' },
          { key: 'totalAssets', label: 'Total Assets (₹)', type: 'text', required: true, placeholder: '18,00,000', readOnly: true },
          { key: 'revenueFromOperations', label: 'Revenue from Operations (₹)', type: 'text', required: true, placeholder: '24,00,000' },
          { key: 'profitBeforeTax', label: 'Profit / (Loss) Before Tax (PBT) (₹)', type: 'text', required: true, placeholder: '3,20,000' },
          { key: 'taxExpense', label: 'Current Tax Expense (₹)', type: 'text', required: false, placeholder: '80,000' },
          { key: 'profitAfterTax', label: 'Profit / (Loss) After Tax (PAT) (₹)', type: 'text', required: true, placeholder: '2,40,000' },
        ],
      },
    ],
    ocrExtractable: [
      'cin', 'companyName', 'financialYearFrom', 'financialYearTo',
      'shareCapital', 'reservesSurplus', 'totalAssets', 'revenueFromOperations',
      'profitAfterTax', 'auditorName', 'firmRegistrationNumber', 'auditorPan',
      'membershipNumber', 'auditorReportDate', 'director1Name', 'director1DIN',
      'boardMeetingDateFS', 'agmDate'
    ],
    requiredDocs: [
      { name: 'Audited Balance Sheet & Profit & Loss Statement (PDF)', required: true },
      { name: "Auditor's Report with Annexures & CARO 2020 (PDF)", required: true },
      { name: "Directors' Report / Board's Report u/s 134 (PDF)", required: true },
      { name: 'Notice of Annual General Meeting (AGM) (PDF)', required: true },
      { name: 'Form MGT-9 (Extract of Annual Return) (PDF)', required: false },
    ],
  },

  // ─── 2. AOC-4-OFFLINE (AOC-4 Offline eForm Engine v3) ──────────────────────
  {
    code: 'AOC-4-OFFLINE',
    name: 'AOC-4 Offline eForm',
    shortLabel: 'AOC-4 Off',
    desc: 'MCA V3 Offline eForm filling engine with id/matchLabel mapping for audited Balance Sheet, P&L, Related Party disclosures & CARO.',
    category: 'Annual Financials',
    dueDate: '30 days after AGM',
    penalty: '₹100 per day of delay',
    color: '#111',
    sections: [
      {
        id: 'general_info',
        label: 'General Information',
        icon: 'Building2',
        fields: [
          { key: 'cin', label: 'Corporate Identity Number (CIN)', type: 'text', required: true, placeholder: 'e.g. U12345MH2020PTC123456' },
          { key: 'authorisedCapital', label: 'Authorised Capital (₹)', type: 'text', required: false, placeholder: '25,00,000' },
          { key: 'numberOfMembers', label: 'Number of Members', type: 'number', required: false, placeholder: '2' },
          { key: 'financialYearFrom', label: 'Financial Year From', type: 'date', required: true },
          { key: 'financialYearTo', label: 'Financial Year To', type: 'date', required: true },
          { key: 'boardMeetingDateFS', label: 'Date of Board Meeting (FS Approved)', type: 'date', required: true },
          { key: 'natureOfFS', label: 'Nature of Financial Statements', type: 'select', required: true,
            options: ['Adopted Financial statements', 'Provisional un-adopted Financial statements', 'Revised Financial statements u/s 130', 'Revised Financial statements u/s 131'] },
          { key: 'provisionalFSFiled', label: 'Whether provisional FS filed earlier?', type: 'select', required: false, options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'signatory_details',
        label: 'Signatory Details',
        icon: 'User',
        fields: [
          { key: 'director1DIN', label: 'Director 1 DIN / PAN', type: 'text', required: true, placeholder: '08765432' },
          { key: 'director1Designation', label: 'Director 1 Designation', type: 'select', required: true,
            options: ['Director', 'Managing Director', 'Whole-time Director', 'CEO', 'CFO', 'Company Secretary'] },
          { key: 'director1DateFS', label: 'Director 1 Signing Date', type: 'date', required: true },
          { key: 'director2DIN', label: 'Director 2 DIN / PAN', type: 'text', required: false, placeholder: '09123456' },
          { key: 'director2Designation', label: 'Director 2 Designation', type: 'select', required: false,
            options: ['Director', 'Managing Director', 'Whole-time Director', 'CEO', 'CFO', 'Company Secretary'] },
          { key: 'boardMeetingDateBR', label: "Board's Report Approval Date", type: 'date', required: true },
          { key: 'director1DateBR', label: "Director 1 Signing Date (Board's Report)", type: 'date', required: true },
        ],
      },
      {
        id: 'agm_details',
        label: 'AGM Details',
        icon: 'Calendar',
        fields: [
          { key: 'agmHeld', label: 'Whether AGM was held', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'agmDate', label: 'Date of AGM', type: 'date', required: true },
          { key: 'agmDueDate', label: 'Due Date of AGM', type: 'date', required: true },
          { key: 'agmExtensionGranted', label: 'Extension for AGM granted by RoC', type: 'select', required: false, options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'auditor_details',
        label: 'Auditor Details',
        icon: 'Shield',
        fields: [
          { key: 'auditorCategory', label: 'Category of Auditor', type: 'select', required: true,
            options: ["Auditor's Firm", 'Individual Auditor'] },
          { key: 'firmRegistrationNumber', label: 'Auditor Firm Registration Number (FRN)', type: 'text', required: true, placeholder: '102934W' },
          { key: 'auditorName', label: "Auditor's Name / Firm Name", type: 'text', required: true, placeholder: 'Auditor firm name' },
          { key: 'membershipNumber', label: 'Membership Number of Signing Auditor', type: 'text', required: true, placeholder: '102934' },
          { key: 'auditorPan', label: "Auditor's PAN", type: 'text', required: true, placeholder: 'AAAFA1234K' },
          { key: 'auditorReportDate', label: "Auditor's Report Date", type: 'date', required: true },
        ],
      },
      {
        id: 'financial_lines',
        label: 'Financial Statements Data',
        icon: 'TrendingUp',
        fields: [
          { key: 'shareCapital', label: 'Paid-up Equity Share Capital (₹)', type: 'text', required: true, placeholder: '10,00,000' },
          { key: 'reservesSurplus', label: 'Reserves and Surplus (₹)', type: 'text', required: true, placeholder: '4,50,000' },
          { key: 'longTermBorrowings', label: 'Long-term Borrowings (₹)', type: 'text', required: false, placeholder: '2,00,000' },
          { key: 'tradePayables', label: 'Trade Payables (₹)', type: 'text', required: false, placeholder: '1,50,000' },
          { key: 'tangibleAssets', label: 'Tangible Assets (₹)', type: 'text', required: true, placeholder: '8,00,000' },
          { key: 'cashBankBalances', label: 'Cash and Bank Balances (₹)', type: 'text', required: true, placeholder: '10,00,000' },
          { key: 'revenueFromOperations', label: 'Revenue from Operations (₹)', type: 'text', required: true, placeholder: '24,00,000' },
          { key: 'profitAfterTax', label: 'Profit After Tax (PAT) (₹)', type: 'text', required: true, placeholder: '2,40,000' },
        ],
      },
    ],
    ocrExtractable: [
      'cin', 'financialYearFrom', 'financialYearTo', 'shareCapital',
      'reservesSurplus', 'revenueFromOperations', 'profitAfterTax',
      'auditorName', 'firmRegistrationNumber', 'auditorPan', 'membershipNumber'
    ],
    requiredDocs: [
      { name: 'Audited Financial Statements (PDF)', required: true },
      { name: "Auditor's Report (PDF)", required: true },
      { name: "Board's Report (PDF)", required: true },
    ],
  },

  // ─── 3. ADT-1 (Appointment of Statutory Auditor) ────────────────────────────
  {
    code: 'ADT-1',
    name: 'Appointment of Auditor',
    shortLabel: 'ADT-1',
    desc: 'Notice to the Registrar for appointment of statutory auditor u/s 139 & 140 of the Companies Act, 2013 within 15 days of AGM.',
    category: 'Governance & Audit',
    dueDate: 'Within 15 days of AGM / Appointment',
    penalty: '₹300 per day, max ₹3 lakh',
    color: '#1a1a1a',
    sections: [
      {
        id: 'company',
        label: '1–2. Company Information',
        icon: 'Building2',
        fields: [
          { key: 'cin', label: '1. Corporate Identity Number (CIN)', type: 'text', required: true, placeholder: 'e.g. U12345MH2020PTC123456', hint: 'Auto-verified against MCA V3' },
          { key: 'companyName', label: '2(a) Name of the Company', type: 'text', required: false, readOnly: true, placeholder: 'Company name as registered with MCA' },
          { key: 'companyAddress', label: '2(b) Address of Registered Office', type: 'text', required: false, placeholder: '123 Business Park, Mumbai 400001' },
          { key: 'companyEmail', label: '2(c) Email ID of the Company', type: 'text', required: false, placeholder: 'info@sharmatech.com' },
        ],
      },
      {
        id: 'appointment',
        label: '3–4. Appointment Details',
        icon: 'Shield',
        fields: [
          { key: 'natureOfAppointment', label: '3(b) Nature of Appointment', type: 'select', required: true,
            options: [
              'First auditor by Board/members/C&AG',
              'Appointment of Auditors in AGM',
              'Re-appointment of Auditors in AGM',
              'Appointment/ Re-appointment by C&AG',
              'Auditor appointed in case of casual vacancy',
              'Auditor appointed in case of non-re-appointment/ removal of the previous auditor',
              'Auditor appointed by the Tribunal',
              'Auditor appointed by Central Government',
              'Others'
            ] },
          { key: 'natureOfAppointmentOther', label: '3(b)(i) If Others, please specify', type: 'textarea', required: false, placeholder: 'Details if Others selected' },
          { key: 'agmApproval', label: '(c) Whether approved in AGM', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'agmDate', label: '(d) Date of AGM (if approved in AGM)', type: 'date', required: false },
          { key: 'dateOfAppointment', label: '4(a) Date of Appointment', type: 'date', required: true },
          { key: 'jointAuditors', label: '4(b) Whether joint auditors appointed', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'numAuditorsAppointed', label: '4(c) Number of Auditor(s) Appointed', type: 'number', required: true, placeholder: '1' },
          { key: 'auditorCategory', label: '4(d) Category of Auditor', type: 'select', required: true,
            options: ["Auditor's Firm", 'Individual'] },
        ],
      },
      {
        id: 'auditorFirm',
        label: "4(e)-(f). Auditor's Firm Details",
        icon: 'Building2',
        fields: [
          { key: 'firmRegistrationNumber', label: '4(e) Firm Registration Number (FRN)', type: 'text', required: true, placeholder: '102934W' },
          { key: 'firmName', label: "4(f) Name of the Auditor's Firm", type: 'text', required: true, placeholder: 'Auditor firm name' },
          { key: 'firmPan', label: "4(f)(i) PAN of Auditor's Firm", type: 'text', required: true, placeholder: 'AAAFA1234K' },
          { key: 'firmAddr1', label: 'Firm — Address Line 1', type: 'text', required: false, placeholder: '12 CA Street, Fort' },
          { key: 'firmAddr2', label: 'Firm — Address Line 2', type: 'text', required: false, placeholder: 'Near Flora Fountain' },
          { key: 'firmCountry', label: 'Firm — Country', type: 'text', required: false, placeholder: 'India' },
          { key: 'firmPin', label: 'Firm — PIN / Zip Code', type: 'text', required: false, placeholder: '400001' },
          { key: 'firmCity', label: 'Firm — City', type: 'text', required: false, placeholder: 'Mumbai' },
          { key: 'firmDistrict', label: 'Firm — District', type: 'text', required: false, placeholder: 'Mumbai' },
          { key: 'firmState', label: 'Firm — State / UT', type: 'text', required: false, placeholder: 'Maharashtra' },
          { key: 'firmEmail', label: 'Firm — Email ID', type: 'text', required: false, placeholder: 'office@ksraoandco.com' },
        ],
      },
      {
        id: 'auditorIndividual',
        label: '4(g)-(j). Signing Auditor Details',
        icon: 'User',
        fields: [
          { key: 'membershipNumber', label: '4(g) Membership Number of Signing Auditor', type: 'text', required: true, placeholder: '102934' },
          { key: 'auditorName', label: '4(h) Name of the Auditor', type: 'text', required: true, placeholder: 'Signing partner name' },
          { key: 'auditorPan', label: '4(h)(i) PAN of the Auditor', type: 'text', required: true, placeholder: 'ABCDE1234F' },
          { key: 'auditorAddr1', label: 'Auditor — Address Line 1', type: 'text', required: false, placeholder: '12 CA Street, Fort' },
          { key: 'auditorPin', label: 'Auditor — PIN Code', type: 'text', required: false, placeholder: '400001' },
          { key: 'auditorCity', label: 'Auditor — City', type: 'text', required: false, placeholder: 'Mumbai' },
          { key: 'auditorState', label: 'Auditor — State / UT', type: 'text', required: false, placeholder: 'Maharashtra' },
          { key: 'auditorEmail', label: 'Auditor — Email ID', type: 'text', required: false, placeholder: 'rao@ksraoandco.com' },
          { key: 'periodFrom', label: '4(i) Period of Account — From', type: 'date', required: true },
          { key: 'periodTo', label: '4(i) Period of Account — To', type: 'date', required: true },
          { key: 'numFinancialYears', label: '4(j) Number of Financial Years Appointment Relates To', type: 'number', required: true, placeholder: '5' },
        ],
      },
      {
        id: 'priorAppointments',
        label: '4(n)-(s). Prior Appointments',
        icon: 'Calendar',
        fields: [
          { key: 'numPriorFinancialYears', label: '4(n) Number of Prior Financial Years Appointed', type: 'number', required: false, placeholder: '0' },
          { key: 'priorRow1FirmReg', label: '4(p) Row 1 — Firm Registration Number', type: 'text', required: false, placeholder: '102934W' },
          { key: 'priorRow1Membership', label: '4(q) Row 1 — Membership Number', type: 'text', required: false, placeholder: '102934' },
          { key: 'priorRow1FyStart', label: '4(r) Row 1 — FY Start Date', type: 'date', required: false },
          { key: 'priorRow1FyEnd', label: '4(s) Row 1 — FY End Date', type: 'date', required: false },
        ],
      },
      {
        id: 'tribunal',
        label: '6. Tribunal Order Details',
        icon: 'Shield',
        fields: [
          { key: 'inc28Srn', label: '6. SRN of INC-28 (Tribunal Order for Appointment)', type: 'text', required: false, placeholder: 'R12345678' },
        ],
      },
      {
        id: 'casualVacancy',
        label: '7. Casual Vacancy Details',
        icon: 'User',
        fields: [
          { key: 'casualVacancyReason', label: '7(a) Casual Vacancy Reason', type: 'select', required: false,
            options: ['Resignation', 'Others (death, disqualification)'] },
          { key: 'relevantFormSrn', label: '7(b) SRN of Relevant Form (ADT-3 / 23B / GNL-2)', type: 'text', required: false, placeholder: 'R87654321' },
          { key: 'casualVacancyDate', label: '7(c) Date of Casual Vacancy', type: 'date', required: false },
          { key: 'vacatedFirmRegNumber', label: '7(d) Registration Number of Vacating Firm', type: 'text', required: false, placeholder: '109876W' },
          { key: 'vacatingAuditorMembership', label: '7(e) Membership Number of Vacating Auditor', type: 'text', required: false, placeholder: '098765' },
          { key: 'casualVacancyReasonText', label: '7(f) Specific Reasons of Casual Vacancy', type: 'textarea', required: false, placeholder: 'Detailed explanation of vacancy...' },
        ],
      },
      {
        id: 'declaration',
        label: '8. Declaration & Signatory',
        icon: 'CheckCircle2',
        fields: [
          { key: 'resolutionNumber', label: 'Board Resolution Number', type: 'text', required: true, placeholder: '2026/BR/08/01' },
          { key: 'resolutionDate', label: 'Board Resolution Date', type: 'date', required: true },
          { key: 'signatoryDesignation', label: 'Designation of Signatory (Declarant)', type: 'select', required: true,
            options: ['Director', 'Managing Director', 'Manager', 'Company Secretary', 'CEO', 'CFO', 'Liquidator'] },
          { key: 'signatoryIdentifier', label: 'DIN / PAN / Membership No. of Signatory', type: 'text', required: true, placeholder: '08765432' },
        ],
      },
    ],
    ocrExtractable: [
      'cin', 'companyName', 'companyEmail', 'natureOfAppointment',
      'firmRegistrationNumber', 'firmName', 'firmPan', 'membershipNumber',
      'auditorName', 'auditorPan', 'periodFrom', 'periodTo',
      'resolutionNumber', 'resolutionDate', 'signatoryIdentifier'
    ],
    requiredDocs: [
      { name: 'Copy of Board / AGM Resolution for Appointment (PDF)', required: true },
      { name: 'Consent & Eligibility Certificate from Auditor u/s 139 & 141 (PDF)', required: true },
      { name: 'Intimation letter from Company to Auditor (PDF)', required: false },
    ],
  },

  // ─── 4. MGT-7 (Annual Return) ──────────────────────────────────────────────
  {
    code: 'MGT-7',
    name: 'Annual Return',
    shortLabel: 'MGT-7',
    desc: 'Annual Return filed by companies with shareholders, directors, meetings, remuneration & share capital details.',
    category: 'Annual Compliance',
    dueDate: '60 days after AGM',
    penalty: '₹100 per day of delay',
    color: '#000',
    sections: [
      {
        id: 'registration',
        label: 'Registration Details',
        icon: 'Building2',
        fields: [
          { key: 'cin', label: 'Corporate Identity Number (CIN)', type: 'text', required: true, placeholder: 'e.g. U12345MH2020PTC123456' },
          { key: 'companyName', label: 'Company Name', type: 'text', required: false, readOnly: true, placeholder: 'Company name as registered with MCA' },
          { key: 'registeredOfficeAddress', label: 'Registered Office Address', type: 'text', required: false, placeholder: '123 Business Park, Mumbai 400001' },
          { key: 'emailId', label: 'Company Email ID', type: 'text', required: true, placeholder: 'info@sharmatech.com' },
          { key: 'telephone', label: 'Telephone Number', type: 'text', required: false, placeholder: '+91 22 2654 3210' },
          { key: 'financialYearFrom', label: 'Financial Year From', type: 'date', required: true },
          { key: 'financialYearTo', label: 'Financial Year To', type: 'date', required: true },
          { key: 'companyClass', label: 'Class of Company', type: 'select', required: true, options: ['Private', 'Public'] },
          { key: 'companyCategory', label: 'Category of Company', type: 'select', required: true, options: ['Company limited by shares', 'Company limited by guarantee', 'Unlimited Company'] },
          { key: 'companySubCategory', label: 'Sub-Category of Company', type: 'select', required: true, options: ['Indian Non-Government Company', 'Indian Government Company'] },
          { key: 'hasShareCapital', label: 'Whether company has share capital', type: 'select', required: true, options: ['Yes', 'No'] },
        ],
      },
      {
        id: 'agm_details',
        label: 'AGM & Meetings Details',
        icon: 'Calendar',
        fields: [
          { key: 'agmHeld', label: 'Whether AGM was held', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'agmDate', label: 'Date of AGM', type: 'date', required: true },
          { key: 'agmDueDate', label: 'Due Date of AGM', type: 'date', required: true },
          { key: 'agmExtensionGranted', label: 'Extension for AGM granted by RoC', type: 'select', required: false, options: ['Yes', 'No'] },
          { key: 'numberOfBoardMeetings', label: 'Number of Board Meetings Held in FY', type: 'number', required: true, placeholder: '4' },
          { key: 'numberOfMembers', label: 'Total Number of Members as at FY End', type: 'number', required: true, placeholder: '2' },
        ],
      },
    ],
    ocrExtractable: ['cin', 'companyName', 'financialYearFrom', 'financialYearTo', 'agmDate', 'numberOfMembers'],
    requiredDocs: [
      { name: 'List of Shareholders & Debenture Holders (PDF/XLS)', required: true },
      { name: 'Copy of MGT-8 Secretarial Audit Certificate (PDF)', required: false },
    ],
  },

  // ─── 5. DIR-3-KYC (Director KYC Verification) ──────────────────────────────
  {
    code: 'DIR-3-KYC',
    name: 'Director KYC Verification',
    shortLabel: 'DIR-3 KYC',
    desc: 'Annual KYC verification for all active Director Identification Number (DIN) holders with OTP validation.',
    category: 'Director KYC',
    dueDate: 'September 30 annually',
    penalty: '₹5,000 flat penalty for late filing',
    color: '#000',
    sections: [
      {
        id: 'identity',
        label: '1. Identity Details',
        icon: 'User',
        fields: [
          { key: 'din', label: 'Director Identification Number (DIN)', type: 'text', required: true, placeholder: '08765432' },
          { key: 'directorName', label: 'First Name', type: 'text', required: true, placeholder: 'First name' },
          { key: 'middleName', label: 'Middle Name', type: 'text', required: false, placeholder: 'Middle name' },
          { key: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Last name' },
          { key: 'fatherName', label: "Father's Full Name", type: 'text', required: false, placeholder: 'Father\'s full name' },
          { key: 'pan', label: 'Permanent Account Number (PAN)', type: 'text', required: true, placeholder: 'ABCDE1234F' },
          { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)', type: 'date', required: true },
          { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Other'] },
          { key: 'nationality', label: 'Nationality', type: 'select', required: true, options: ['Indian', 'Others'] },
        ],
      },
      {
        id: 'contact',
        label: '2. Contact & OTP Verification',
        icon: 'Shield',
        fields: [
          { key: 'mobile', label: 'Personal Mobile Number (for OTP)', type: 'text', required: true, placeholder: '9876543210' },
          { key: 'email', label: 'Personal Email ID (for OTP)', type: 'text', required: true, placeholder: 'ramesh.sharma@example.com' },
          { key: 'aadhaarNumber', label: 'Aadhaar Number (Optional)', type: 'text', required: false, placeholder: '1234 5678 9012' },
        ],
      },
      {
        id: 'address',
        label: '3. Permanent Residential Address',
        icon: 'MapPin',
        fields: [
          { key: 'addressLine1', label: 'Address Line 1', type: 'text', required: true, placeholder: 'Flat 402, Sunshine Towers' },
          { key: 'city', label: 'City / District', type: 'text', required: true, placeholder: 'Mumbai' },
          { key: 'state', label: 'State', type: 'text', required: true, placeholder: 'Maharashtra' },
          { key: 'pincode', label: 'PIN Code', type: 'text', required: true, placeholder: '400051' },
        ],
      },
    ],
    ocrExtractable: ['din', 'directorName', 'pan', 'dob', 'addressLine1', 'pincode'],
    requiredDocs: [
      { name: 'Self-attested PAN Card copy (PDF)', required: true },
      { name: 'Self-attested Aadhaar Card copy (PDF)', required: true },
      { name: 'Address Proof (Electricity Bill / Bank Statement < 2 months old) (PDF)', required: true },
    ],
  },

  // ─── 6. SPICE-A (Name Reservation) ─────────────────────────────────────────
  {
    code: 'SPICE-A',
    name: 'SPICe+ Part A (Name Reservation)',
    shortLabel: 'SPICe+ A',
    desc: 'Application for reservation of proposed company name with industrial activity classification (NIC code).',
    category: 'Incorporation',
    dueDate: 'Pre-incorporation step (Valid for 20 days)',
    penalty: 'No late fee — application expires if not filed in 20 days',
    color: '#000',
    sections: [
      {
        id: 'type',
        label: '1. Type & Class of Company',
        icon: 'Building2',
        fields: [
          { key: 'companyType', label: 'Type of Company', type: 'select', required: true,
            options: ['New Company (Others)', 'Part I Section 8 Company', 'Producer Company'] },
          { key: 'companyClass', label: 'Company Class', type: 'select', required: true,
            options: ['Private', 'Public', 'One Person Company'] },
          { key: 'companyCategory', label: 'Company Category', type: 'select', required: true,
            options: ['Company limited by shares', 'Company limited by guarantee', 'Unlimited Company'] },
          { key: 'companySubCategory', label: 'Company Sub-Category', type: 'select', required: true,
            options: ['Indian Non-Government Company', 'Indian Government Company'] },
        ],
      },
      {
        id: 'names',
        label: '2. Proposed Company Names',
        icon: 'FileText',
        fields: [
          { key: 'proposedName1', label: 'Proposed Name (Preference 1)', type: 'text', required: true, placeholder: 'GERMIN8 TECHNOLOGIES PRIVATE LIMITED' },
          { key: 'proposedName2', label: 'Proposed Name (Preference 2)', type: 'text', required: false, placeholder: 'GERMIN8 INNOVATIONS PRIVATE LIMITED' },
          { key: 'nameSignificance', label: 'Significance of proposed name & description of main division', type: 'textarea', required: true, placeholder: 'Germin8 signifies growth and digital compliance automation...' },
        ],
      },
      {
        id: 'nic',
        label: '3. Industrial Activity (NIC)',
        icon: 'TrendingUp',
        fields: [
          { key: 'nicCode', label: 'Main Division of Industrial Activity (NIC Code)', type: 'text', required: true, placeholder: '62 — Computer programming, consultancy and related activities' },
          { key: 'nicDescription', label: 'Description of Main Business Activities', type: 'textarea', required: true, placeholder: 'Providing SaaS platforms for automated legal, statutory, and corporate compliance.' },
        ],
      },
    ],
    ocrExtractable: [],
    requiredDocs: [
      { name: 'NOC from existing trademark / company owner (if applicable) (PDF)', required: false },
      { name: 'Board Resolution for name change / group company NOC (if applicable) (PDF)', required: false },
    ],
  },

  // ─── 7. INC-32 (SPICe+ Part B Incorporation) ──────────────────────────────
  {
    code: 'INC-32',
    name: 'SPICe+ Part B (Incorporation)',
    shortLabel: 'INC-32',
    desc: 'Integrated incorporation eForm — DIN allocation, PAN/TAN application, EPFO/ESIC registrations & Bank account opening.',
    category: 'Incorporation',
    dueDate: 'Within 20 days of Name Reservation',
    penalty: 'Re-reservation required if expired',
    color: '#000',
    sections: [
      {
        id: 'company_details',
        label: '1. Structure & Capital',
        icon: 'Building2',
        fields: [
          { key: 'authorisedCapital', label: 'Authorised Share Capital (₹)', type: 'text', required: true, placeholder: '15,00,000' },
          { key: 'subscribedCapital', label: 'Subscribed Share Capital (₹)', type: 'text', required: true, placeholder: '1,00,000' },
          { key: 'numberOfDirectors', label: 'Number of First Directors', type: 'number', required: true, placeholder: '2' },
          { key: 'numberOfSubscribers', label: 'Number of Individual Subscribers', type: 'number', required: true, placeholder: '2' },
        ],
      },
      {
        id: 'approved_name',
        label: '2. SRN & Approved Name',
        icon: 'FileText',
        fields: [
          { key: 'srnSpiceA', label: 'SRN of Approved SPICe+ Part A', type: 'text', required: true, placeholder: 'N12345678' },
          { key: 'approvedName', label: 'Approved Company Name', type: 'text', required: true, placeholder: 'GERMIN8 TECHNOLOGIES PRIVATE LIMITED' },
        ],
      },
      {
        id: 'registrations',
        label: '3. Statutory Registrations (AGILE-PRO-S)',
        icon: 'Shield',
        fields: [
          { key: 'applyPanTan', label: 'Apply for PAN & TAN?', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'applyEpfoEsic', label: 'Apply for EPFO & ESIC Registrations?', type: 'select', required: true, options: ['Yes', 'No'] },
          { key: 'applyBank', label: 'Select Preferred Bank for Current Account', type: 'select', required: true,
            options: ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'] },
        ],
      },
    ],
    ocrExtractable: ['approvedName', 'authorisedCapital', 'subscribedCapital'],
    requiredDocs: [
      { name: 'Memorandum of Association (SPICe+ MOA / INC-33) (PDF)', required: true },
      { name: 'Articles of Association (SPICe+ AOA / INC-34) (PDF)', required: true },
      { name: 'Declaration by First Directors & Subscribers (INC-9) (PDF)', required: true },
      { name: 'Consent to Act as Director (DIR-2) (PDF)', required: true },
      { name: 'Proof of Registered Office Address & Utility Bill (PDF)', required: true },
    ],
  },
];

export function getFormByCode(code) {
  if (!code) return MCA_FORMS[0];
  const normalized = code.toUpperCase().replace(/\s+/g, '-');
  return MCA_FORMS.find((f) => f.code === normalized) || MCA_FORMS[0];
}

export function getAllFormCodes() {
  return MCA_FORMS.map((f) => f.code);
}
