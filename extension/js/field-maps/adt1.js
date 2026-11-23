// ADT-1 (Notice to the Registrar for appointment of auditor) — field map. Selectors are exact
// `name` attributes taken from a live DOM scan of mca.gov.in/.../complianceServices/ADT-1.html
// (the extension's "Extract page fields" tool). Unlike MGT-7, this form's fields carry clear,
// distinct aria-labels straight from the Instruction Kit's own numbering (1, 2(a)/(b)/(c), 3(b),
// 4(a)-(j), 4(n)-(s), 6, 7(a)-(f)) even while hidden/not-yet-revealed, so most of the form could be
// mapped from a single extraction — unlike MGT-7's mostly-generic "Text Box" placeholders.
//
// NOT wired here, on purpose:
//  - File-upload attachments (8(a)-(e), the DSC upload) — this engine (filler.js/_shared.js) can't
//    inject files into a file input; attach them by hand, same as the rest of this extension.
//  - Four bare Yes/No (or Yes/No/Not Applicable) radio groups whose aria-label is just "Yes"/
//    "Resignation" with no distinguishing text, where the Instruction Kit doesn't give enough to be
//    sure which field they are — mapping these from a guess risks silently ticking the wrong answer
//    on a form that is STP (no resubmission). A second capture (automation_map_1793801541853.json,
//    2026-11-04) resolved one previously-ambiguous pair into a single confident field (see
//    agmApproval below) but left these four genuinely indistinguishable. Exact selector base ids,
//    for when a future capture (e.g. with "Nature of appointment" actually answered) narrows them:
//      - `guideradiobutton__` (unnumbered) — in the same panel as, and immediately before, the
//        9-option "Nature of appointment" group (NATURE_OF_APPOINTMENT_NAME below).
//      - `guideradiobutton_173` and `guideradiobutton_745` — two consecutive radio groups right
//        after "4(j) Number of financial years" (numFinancialYears), right before "4(n) Number of
//        financial years" (numPriorFinancialYears, which drives the repeatable prior-appointments
//        table) — one of these likely gates that table, but which of the two is unclear.
//      - `guideradiobutton_1983977957` — three-way Yes/No/Not Applicable, right after the
//        prior-appointments row block, right before "6. SRN of INC-28" (inc28Srn below).
//
// `required` below mirrors the live DOM's own required-asterisk on each field. Note this flag is
// currently DECORATIVE for this form: Validator.validateField (js/validator.js) is defined but never
// called anywhere in the codebase, and form-flow.js (which does consult `.required`) isn't loaded by
// popup.html at all — so nothing in this extension actually pre-flight-checks ADT-1 data against it
// yet. Kept accurate anyway so it means the same thing here as in the other field maps.

(function (root) {
  "use strict";

  // Nature of appointment (3(b)) — value must be one of these exact option label strings.
  // (First auditor by Board/members/C&AG | Appointment of Auditors in AGM | Re-appointment of
  // Auditors in AGM | Appointment/ Re-appointment by C&AG | Auditor appointed in case of casual
  // vacancy | Auditor appointed in case of non-re-appointment/ removal of the previous auditor |
  // Auditor appointed by the Tribunal | Auditor appointed by Central Government | Others)
  const NATURE_OF_APPOINTMENT_NAME =
    'guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guideradiobutton_1355804021___jqName';

  const ADT1_CATEGORIES = [
    {
      id: "company",
      label: "Company Information",
      icon: "building",
      fields: [
        // Candidate list: the plain CIN textbox (company user / manual entry) OR the CIN dropdown
        // (business user associated with multiple CINs) — findFirst picks whichever is visible.
        { key: "cin", label: "1. Corporate Identity Number (CIN)", dataKey: "cin", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox___jqName"], select[name="guideContainer-rootPanel-panel_710365359-panel-panel-customdropdown_copy___jqName"], input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox_copy_28_1975902080___jqName"]' },

        { key: "companyName", label: "2(a) Name of the company", dataKey: "companyName", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox_713510892___jqName"]' },

        { key: "companyAddress", label: "2(b) Address of the registered office of the company", dataKey: "companyAddress", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox_2121884284___jqName"]' },

        { key: "companyEmail", label: "2(c) Email ID of the company", dataKey: "companyEmail", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox_2019841549___jqName"]' },
      ],
    },
    {
      id: "appointment",
      label: "Appointment details",
      icon: "shield",
      fields: [
        // Value must exactly match one of the option labels in NATURE_OF_APPOINTMENT_NAME's comment
        // above. NOTE: no waitForSelector here on purpose — only 1 of its 9 options reveals
        // dateOfAppointment, so pointing at it would cost a full 10s stall for the other 8 (a
        // speculative addition I tried and reverted after a live test showed it made things worse,
        // not better — see adt1-radio-value-ambiguity note below).
        { key: "natureOfAppointment", label: "3(b) Nature of appointment", dataKey: "natureOfAppointment", type: "radio", required: true,
          selector: 'input[name="' + NATURE_OF_APPOINTMENT_NAME + '"]' },

        { key: "natureOfAppointmentOther", label: "3(b)(i) If Others, please specify", dataKey: "natureOfAppointmentOther", type: "textarea", required: false,
          selector: 'textarea[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guidetextbox___jqName"]' },

        // Label inferred, not read directly from the DOM: this radio's own aria-label is blank
        // ("Yes"), but it is the ONLY element sitting between natureOfAppointmentOther and agmDate,
        // whose own label literally reads "(d) If yes, date of AGM" — i.e. this is the "if yes" this
        // gates. Resolved from automation_map_1793801541853.json (2026-11-04); verify against the
        // live Instruction Kit wording before relying on it for an actual filing.
        { key: "agmApproval", label: "(c) Whether approved in AGM (inferred by position)", dataKey: "agmApproval", type: "radio", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guideradiobutton_634768949___jqName"]' },

        { key: "agmDate", label: "(d) If yes, date of AGM", dataKey: "agmDate", type: "date", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guidedatepicker___jqName"]' },

        { key: "dateOfAppointment", label: "4(a) Date of appointment", dataKey: "dateOfAppointment", type: "date", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guidedatepicker_2039841684___jqName"]' },

        // Positionally inferred as 4(b) "Whether joint auditors have been appointed" — it sits
        // directly between the appointment-date fields and 4(c) Number of auditors, matching the
        // Instruction Kit's description exactly, but its own aria-label is just "Yes"/"No".
        { key: "jointAuditors", label: "4(b) Whether joint auditors appointed (inferred by position)", dataKey: "jointAuditors", type: "radio", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guideradiobutton_1725319442___jqName"]' },

        { key: "numAuditorsAppointed", label: "4(c) Number of auditor(s) appointed", dataKey: "numAuditorsAppointed", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guidetextbox_458313017___jqName"]' },

        // Value must be exactly "Auditor's Firm" or "Individual". waitForSelector: selecting
        // "Auditor's Firm" reveals 4(e)/4(f) a moment later; without waiting for that render,
        // the very next jobs (firmRegistrationNumber, firmName) can run before those fields exist
        // yet and type into nothing — confirmed live: both came back empty while firmPan (reached
        // later in the job list, after more real time had passed) filled correctly.
        { key: "auditorCategory", label: "4(d) Category of Auditor", dataKey: "auditorCategory", type: "radio", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guideradiobutton_100___jqName"]',
          waitForSelector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_2032373___jqName"]' },
      ],
    },
    {
      id: "auditorFirm",
      label: "Auditor's firm (if Category = Auditor's Firm)",
      icon: "building",
      fields: [
        { key: "firmRegistrationNumber", label: "4(e) Firm Registration Number", dataKey: "firmRegistrationNumber", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_2032373___jqName"]' },

        { key: "firmName", label: "4(f) Name of the Auditor's Firm", dataKey: "firmName", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_2773467___jqName"]' },

        { key: "firmPan", label: "4(f)(i) PAN of auditor's firm", dataKey: "firmPan", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_2145655___jqName"]' },

        { key: "firmAddr1", label: "Firm — Address Line 1", dataKey: "firmAddr1", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281___jqName"]' },
        { key: "firmAddr2", label: "Firm — Address Line 2", dataKey: "firmAddr2", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1566539749___jqName"]' },
        { key: "firmCountry", label: "Firm — Country", dataKey: "firmCountry", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_573335244___jqName"]' },
        { key: "firmPin", label: "Firm — Pin Code/Zip code", dataKey: "firmPin", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1240028835___jqName"]' },
        { key: "firmArea", label: "Firm — Area/Locality (populated by PIN lookup on the live page)", dataKey: "firmArea", type: "select", required: false,
          selector: 'select[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1775336116___jqName"]' },
        { key: "firmCity", label: "Firm — City", dataKey: "firmCity", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_454623722___jqName"]' },
        { key: "firmDistrict", label: "Firm — District", dataKey: "firmDistrict", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_326987168___jqName"]' },
        { key: "firmState", label: "Firm — State/UT", dataKey: "firmState", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1214365988___jqName"]' },
        { key: "firmEmail", label: "Firm — Email ID", dataKey: "firmEmail", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox___jqName"]' },
      ],
    },
    {
      id: "auditorIndividual",
      label: "Signing auditor",
      icon: "user",
      fields: [
        { key: "membershipNumber", label: "4(g) Membership Number of Auditor signing the balance sheet", dataKey: "membershipNumber", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_173393614___jqName"]' },

        { key: "auditorName", label: "4(h) Name of the Auditor", dataKey: "auditorName", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1043567329___jqName"]' },

        { key: "auditorPan", label: "4(h)(i) PAN of the Auditor", dataKey: "auditorPan", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1744630833___jqName"]' },

        { key: "auditorAddr1", label: "Auditor — Address Line 1", dataKey: "auditorAddr1", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_982343637___jqName"]' },
        { key: "auditorAddr2", label: "Auditor — Address Line 2", dataKey: "auditorAddr2", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_904731361___jqName"]' },
        { key: "auditorCountry", label: "Auditor — Country", dataKey: "auditorCountry", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1103902871___jqName"]' },
        { key: "auditorPin", label: "Auditor — Pin Code/Zip Code", dataKey: "auditorPin", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1144734561___jqName"]' },
        { key: "auditorArea", label: "Auditor — Area/Locality (populated by PIN lookup on the live page)", dataKey: "auditorArea", type: "select", required: false,
          selector: 'select[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_508991481___jqName"]' },
        { key: "auditorCity", label: "Auditor — City", dataKey: "auditorCity", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_169804460___jqName"]' },
        { key: "auditorDistrict", label: "Auditor — District", dataKey: "auditorDistrict", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_1878253104___jqName"]' },
        { key: "auditorState", label: "Auditor — State/UT", dataKey: "auditorState", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-auditoraddressstate1___jqName"]' },
        { key: "auditorEmail", label: "Auditor — Email ID", dataKey: "auditorEmail", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_copy___jqName"]' },

        { key: "periodFrom", label: "4(i) Period of account — From", dataKey: "periodFrom", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidedatepicker_1939___jqName"]' },
        { key: "periodTo", label: "4(i) Period of account — To", dataKey: "periodTo", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidedatepicker_9384___jqName"]' },

        { key: "numFinancialYears", label: "4(j) Number of financial year(s) to which appointment relates", dataKey: "numFinancialYears", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1718281_2145845017___jqName"]' },
      ],
    },
    {
      id: "priorAppointments",
      label: "Prior appointments (if auditor previously appointed)",
      icon: "calendar",
      fields: [
        { key: "numPriorFinancialYears", label: "4(n) Number of financial year(s) of prior appointment", dataKey: "numPriorFinancialYears", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-guidetextbox_1879678___jqName"]' },

        // Row 1 of the regenerating 4(o)-(s) table only — further rows (2+) get a fresh generated
        // name per row on the live page and aren't covered here yet. (o)/(p) have no DOM asterisk;
        // (q)/(r)/(s) do.
        { key: "priorRow1FirmReg", label: "4(p) Row 1 — Firm Registration Number", dataKey: "priorRow1FirmReg", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-panel-guidetextbox_1879678_1704772213___jqName"]' },
        { key: "priorRow1Membership", label: "4(q) Row 1 — Membership Number of Auditor", dataKey: "priorRow1Membership", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-panel-guidetextbox_1879678_1345449903___jqName"]' },
        { key: "priorRow1FyStart", label: "4(r) Row 1 — Financial Year Start Date", dataKey: "priorRow1FyStart", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-panel-guidedatepicker_1452___jqName"]' },
        { key: "priorRow1FyEnd", label: "4(s) Row 1 — Financial Year End Date", dataKey: "priorRow1FyEnd", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel-panel-guidedatepicker_1807___jqName"]' },
      ],
    },
    {
      id: "tribunal",
      label: "Tribunal order (if Nature of appointment = Tribunal)",
      icon: "shield",
      fields: [
        { key: "inc28Srn", label: "6. SRN of INC-28 (Tribunal order for appointment)", dataKey: "inc28Srn", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-guidetextbox_1879678___jqName"]' },
      ],
    },
    {
      id: "casualVacancy",
      label: "Casual vacancy details (if Nature of appointment = casual vacancy)",
      icon: "user",
      fields: [
        // Value must be exactly "Resignation" or "Others (death, disqualification)".
        { key: "casualVacancyReason", label: "7(a) Auditor appointed due to casual vacancy — reason", dataKey: "casualVacancyReason", type: "radio", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guideradiobutton_142___jqName"]' },

        { key: "casualVacancyOtherReason", label: "7(a)(i) If Others, please specify", dataKey: "casualVacancyOtherReason", type: "select", required: true,
          selector: 'select[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidetextbox_1879678___jqName"]' },

        { key: "relevantFormSrn", label: "7(b) SRN of relevant form (ADT-3/23B/GNL-2)", dataKey: "relevantFormSrn", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidetextbox_1879678_1676290710___jqName"]' },

        { key: "casualVacancyDate", label: "7(c) Date of casual vacancy", dataKey: "casualVacancyDate", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidedatepicker_1559___jqName"]' },

        { key: "vacatedFirmRegNumber", label: "7(d) Registration number of the firm that vacated office", dataKey: "vacatedFirmRegNumber", type: "text", required: false,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidetextbox_1879678_1832123785___jqName"]' },

        { key: "vacatingAuditorMembership", label: "7(e) Membership number of the (vacating) auditor", dataKey: "vacatingAuditorMembership", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidetextbox_1879678_1397872430___jqName"]' },

        { key: "casualVacancyReasonText", label: "7(f) Reasons of the casual vacancy", dataKey: "casualVacancyReasonText", type: "textarea", required: true,
          selector: 'textarea[name="guideContainer-rootPanel-panel_710365359-panel_8730171-panel-panel_1394742034-guidetextbox_1879678_1511702774___jqName"]' },
      ],
    },
    {
      id: "declaration",
      label: "Declaration",
      icon: "shield",
      fields: [
        { key: "resolutionNumber", label: "Board resolution number", dataKey: "resolutionNumber", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_1045215663-panel-panel-guidetextbox___jqName"]' },

        { key: "resolutionDate", label: "Board resolution date", dataKey: "resolutionDate", type: "date", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_1045215663-panel-panel-guidedatepicker___jqName"]' },

        // Value must be exactly one of: Director | Manager | Company Secretary | CEO | CFO |
        // Liquidator | Interim Resolution Professional (IRP) | Resolution Professional (RP)
        { key: "signatoryDesignation", label: "Designation of the person signing", dataKey: "signatoryDesignation", type: "select", required: true,
          selector: 'select[name="guideContainer-rootPanel-panel_710365359-panel_1045215663-panel-guidetextbox_copy_219177021___jqName"]' },

        { key: "signatoryIdentifier", label: "DIN / PAN / Membership number of the signatory (per Designation above)", dataKey: "signatoryIdentifier", type: "text", required: true,
          selector: 'input[name="guideContainer-rootPanel-panel_710365359-panel_1045215663-panel-guidetextbox_copy_1728648453___jqName"]' },
      ],
    },
  ];

  const ADT1_FIELDS = ADT1_CATEGORIES.flatMap(function (c) {
    return c.fields.map(function (f) {
      return Object.assign({ category: c.id, categoryLabel: c.label }, f);
    });
  });

  root.ADT1_CATEGORIES = ADT1_CATEGORIES;
  root.ADT1_FIELDS = ADT1_FIELDS;
  root.ADT1_EXPECTED_FIELDS = ADT1_FIELDS.length;
})(typeof window !== "undefined" ? window : globalThis);
