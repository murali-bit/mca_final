# Germin8 MCA Suite — Claude Code Context
> Full project context, architecture, plans, and coding standards for Claude Code.
> Read this entire file before making any changes.

---

## 🗺️ Project Overview

**Germin8** is a production MCA (Ministry of Corporate Affairs) compliance automation suite for Chartered Accountants and Company Secretaries in India. It automates filing statutory forms on the MCA V3 portal (mca.gov.in).

### Three Components:
1. **Dashboard** (`dashboard/`) — React + Vite frontend. CA fills form data here.
2. **Backend** (`backend/`) — Node.js + SQLite API server. Bridges dashboard ↔ extension.
3. **Chrome Extension** (to be built at `extension/`) — Automates MCA portal form filling.

### Running Servers:
- Backend: `node backend/server.js` → http://localhost:4000
- Frontend: `cd dashboard && npm run dev` → http://localhost:5173

---

## 📁 Current File Structure

```
germin8-mca-suite/
├── backend/
│   ├── server.js                    ← Main HTTP server (all API routes)
│   ├── db.js                        ← SQLite WAL-mode DB (node:sqlite built-in, NO external package)
│   ├── gateway.js                   ← API gateway: FileSure CIN lookup, Claude OCR, Razorpay
│   ├── seed.js                      ← Seeds users, clients (Lessonboard, Germin8, Cartrendz), ADT-1 draft
│   ├── data/germin8.db              ← SQLite database file
│   ├── .env                         ← Razorpay test key: rzp_test_1DP5mmOlF5G5ag
│   └── .env.example
│
├── dashboard/src/
│   ├── lib/
│   │   ├── firebase.js              ← Firebase Phone Auth (project: germin8-e6079)
│   │   ├── api.js                   ← All API client functions
│   │   ├── extensionConnector.js    ← Connects dashboard ↔ extension (externally_connectable)
│   │   └── utils.js
│   ├── store/
│   │   ├── authStore.js             ← Zustand auth store (OTP + Firebase)
│   │   └── notificationStore.js
│   ├── components/
│   │   └── McaFormsHub.jsx          ← Main MCA forms UI (ADT-1, payment, etc.)
│   ├── pages/auth/LoginPage.jsx
│   └── data/
│       ├── mcaForms.js              ← Form definitions
│       └── mcaMasterDirectory.js
│
└── extension/                       ← ALREADY EXISTS — MV3 Chrome Extension v1.5.0
    ├── manifest.json                ← MV3, side panel, host: *.mca.gov.in
    ├── background.js                ← Service worker (orchestrator, CIN validator)
    ├── content_script.js            ← Main content script injected on MCA pages
    ├── popup.html                   ← Side panel UI (opens as Chrome side panel)
    ├── popup.js                     ← Side panel logic
    ├── js/
    │   ├── field-maps/              ← Field selector maps per form
    │   │   ├── _shared.js           ← Shared helpers
    │   │   ├── adt1.js              ← ADT-1 field selectors ✅
    │   │   ├── aoc4.js              ← AOC-4 field selectors ✅
    │   │   ├── aoc4-offline.js      ← AOC-4 offline Excel version ✅
    │   │   ├── mgt7.js              ← MGT-7 field selectors ✅
    │   │   ├── dir3.js              ← DIR-3 KYC selectors ✅
    │   │   ├── inc32.js             ← INC-32 selectors ✅
    │   │   └── spice-a.js           ← SPICe+ Part A selectors ✅
    │   ├── forms-registry.js        ← Registry of all supported forms
    │   ├── filler.js                ← Core field filler (setNativeValue etc.)
    │   ├── field-mapper.js          ← Maps client JSON keys → form field selectors
    │   ├── phase-runner.js          ← Phase loop: fill → save → error → retry
    │   ├── error-handler.js         ← Error normalization + toast/panel display
    │   ├── validator.js             ← CIN, DIN, PAN, date validation
    │   ├── storage.js               ← chrome.storage.local wrapper
    │   ├── form-flow.js             ← High-level form orchestration
    │   ├── adt1-engine.js           ← ADT-1 specific automation engine
    │   ├── adt1-flow.js             ← ADT-1 step flow definitions
    │   ├── offline-engine.js        ← Excel offline form engine (AOC-4 offline)
    │   ├── extractor.js             ← Data extractor from PDF/page
    │   ├── pdf-extractor.js         ← PDF.js-based extractor
    │   ├── page-automation.js       ← Low-level page interaction helpers
    │   └── ui/
    │       ├── data-card.js         ← Displays client data in side panel
    │       ├── error-panel.js       ← Error display panel
    │       ├── field-extractor.js   ← UI for extracting field data
    │       ├── form-picker.js       ← Form selection UI
    │       ├── run-status.js        ← Running status display
    │       ├── timeline.js          ← Filing timeline/progress UI
    │       └── toasts.js            ← Toast notification system
    ├── data/
    │   ├── err-catalog.json         ← Error codes → human messages (ERR_MCA_SESSION_LOST etc.)
    │   └── field-mappings.json      ← Field selector reference snapshot
    ├── clients/                     ← Client JSON data files (the "payload")
    │   ├── index.json               ← Client registry
    │   ├── lessonboard_fy2024_25.json
    │   ├── lessonboard_fy2025_26_adt1.json
    │   ├── germin8_first_auditor_adt1.json
    │   ├── cartrendz_fy2025_26.json
    │   └── varsalterra_adt1_ac6797408.json
    ├── libs/
    │   ├── pdf.min.js               ← PDF.js for client-side PDF extraction
    │   └── pdf.worker.min.js
    └── css/
        ├── styles.css
        ├── tokens.css
        └── icons.css
```

---

## 🔑 Key Technical Rules

### 1. SQLite — Use ONLY Node.js built-in
```javascript
// ✅ CORRECT — node:sqlite is built-in to Node 24+
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./data/germin8.db');

// ❌ NEVER install sqlite3, better-sqlite3, or any external sqlite package
```

### 2. Backend API Routes (already exist in server.js)
```
GET  /api/health
POST /api/auth/send-otp
POST /api/auth/verify-otp
GET  /api/auth/me
POST /api/auth/logout
GET  /api/clients
POST /api/clients
GET  /api/adt1/drafts
POST /api/adt1/drafts
GET  /api/adt1/drafts/:id
GET  /api/adt1/drafts/:id/extension-payload
POST /api/payments/create-order
POST /api/payments/verify
POST /api/payments/razorpay/create-order
POST /api/payments/razorpay/verify
GET  /api/gateway/status
POST /api/gateway/filesure/cin-lookup
POST /api/gateway/filesure/submit
POST /api/gateway/claude/extract
```

### 3. NEW Routes to Add (extension push system)
```
POST /api/extension/push          → save job { id, formType, clientId, payload, status: "ready" }
GET  /api/extension/jobs          → extension polls every 3s, returns pending jobs
GET  /api/extension/jobs/:id      → get specific job status
PUT  /api/extension/jobs/:id      → update job status (started / completed / error)
```

### 4. Firebase Config
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDrn4HAfjJ75-_iZho2SoLzAo0H0hBNehs",
  authDomain: "germin8-e6079.firebaseapp.com",
  projectId: "germin8-e6079",
  storageBucket: "germin8-e6079.firebasestorage.app",
  messagingSenderId: "1040283940234",
  appId: "1:1040283940234:web:c09987bc1d85f34e090473",
  measurementId: "G-8C8V27YNJ2"
};
```

### 5. Seeded Test Data
- **Users:** phone `+919042846208`, master test OTP: `123456`
- **Clients:** Lessonboard, Germin8, Cartrendz (3 companies)
- **ADT-1 Draft:** 1 existing draft in DB

---

## 🏗️ What We Are Building Now

### The Smart Autopilot System

**Flow:**
```
Dashboard (CA fills form) → "Push to Extension 🚀" button
→ Backend saves job
→ Extension polls → sees new job → shows in popup
→ CA clicks [Start Automation]
→ Extension opens MCA portal tab
→ FIELD FINDER scans all inputs on the page
→ SMART FILLER fills each field (skips MCA-autofilled ones)
→ Clicks [Save] after each section/phase
→ ERROR WATCHER detects any error after save
→ ERROR ENGINE translates raw MCA error → human message
→ Auto-fixes if possible (date format, missing field, etc.)
→ If cannot auto-fix → pauses → shows error card in popup
→ CA fixes in popup → extension re-fills → retries save
→ Next section → repeat
→ Final submit → SRN extracted → saved to backend
→ Dashboard shows: "✅ Filed! SRN: B12345678"
```

---

## 🧩 Extension — What Already Exists vs What to Add

### ✅ Already Built (DO NOT overwrite or rewrite these):
- `manifest.json` — MV3, side panel, externally_connectable for localhost:4000
- `background.js` — Service worker with CIN validator, message router, log handler
- `content_script.js` — Main injected script on MCA pages
- `popup.html` / `popup.js` — Side panel UI
- `js/filler.js` — Core field filler (setNativeValue pattern already implemented)
- `js/field-maps/*.js` — All 7 form field selector maps (adt1, aoc4, mgt7, dir3, etc.)
- `js/phase-runner.js` — Phase loop with save → error → retry already implemented
- `js/error-handler.js` — Error normalization rules (regex-based, matches known MCA errors)
- `js/validator.js` — CIN, DIN, PAN validation already there
- `js/storage.js` — chrome.storage.local wrapper
- `data/err-catalog.json` — Error codes with human messages and remedy steps
- `clients/*.json` — Client data files (the "payload" pushed to form)

### 🔨 What Needs to Be ADDED/ENHANCED:

#### 1. Dashboard → Extension Push System (NEW)
- Backend: `POST /api/extension/push`, `GET /api/extension/jobs`, `PUT /api/extension/jobs/:id`
- Dashboard: "Push to Extension 🚀" button in `McaFormsHub.jsx`
- Extension: polling in `background.js` → show pending jobs in side panel

#### 2. Intelligent Field Finder (ENHANCE existing field-mapper.js)
- Add 3-tier matching: exact alias → fuzzy → AI fallback
- Add autofill detection (skip MCA-prefilled readonly/disabled fields)
- Expand `mca-field-dictionary.json` with all label variations

#### 3. Error Auto-Fix (ENHANCE existing error-handler.js)
- Add `autoFixable: true/false` to error rules
- Add date format auto-fix (re-normalize and re-fill)
- Add attachment auto-compress flow
- Add "pause for user" flow when not auto-fixable

#### 4. Session Timeout Recovery (NEW)
- Detect MCA login redirect in content_script.js
- Save state to chrome.storage.local
- Resume from saved state after re-login

#### 5. Dashboard Push Receiver in Popup (NEW UI)
- Side panel shows pending jobs fetched from backend
- "Start Automation" button per job
- Real-time progress: phase X of Y, field status list

---

## 🧠 Core Engine Code Patterns

### 1. setNativeValue — The ONLY correct way to fill Angular/React inputs
```javascript
// MCA portal uses Angular. element.value = "x" does NOT work.
// You MUST use this pattern:
function setNativeValue(el, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'value'
  ).set;
  nativeSetter.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur',   { bubbles: true }));
}
```

### 2. waitForElement — No setTimeout, use MutationObserver
```javascript
function waitForElement(selector, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); reject(`Timeout: ${selector}`); }, timeout);
  });
}
```

### 3. Field Finder — 5-Strategy Label Detection
```javascript
function findLabel(el) {
  // A: <label for="id">
  if (el.id) {
    const lbl = document.querySelector(`label[for="${el.id}"]`);
    if (lbl) return lbl.innerText.trim();
  }
  // B: Parent <label>
  const parentLabel = el.closest('label');
  if (parentLabel) return parentLabel.innerText.trim();
  // C: aria-labelledby
  const lblId = el.getAttribute('aria-labelledby');
  if (lblId) return document.getElementById(lblId)?.innerText.trim() || '';
  // D: Nearest text in form-group/mat-form-field
  const parent = el.closest('.form-group, mat-form-field, .field-wrapper, .row');
  if (parent) {
    for (const span of parent.querySelectorAll('label, span, p')) {
      const t = span.innerText.trim();
      if (t && t.length < 100) return t;
    }
  }
  // E: Placeholder fallback
  return el.placeholder || el.name || '';
}
```

### 4. Autofill Detection — Skip MCA-prefilled fields
```javascript
function isAutoFilled(el) {
  // Skip readonly/disabled fields — MCA already filled them
  if (el.readOnly || el.disabled) return true;
  // Skip if MCA marked it
  if (el.getAttribute('data-mca-prefilled') === 'true') return true;
  return false;
}
```

### 5. Date Normalizer — Any format → DD/MM/YYYY (MCA format)
```javascript
function normalizeDate(raw) {
  // Accepts: "2024-10-15", "15-10-2024", "October 15, 2024", timestamps
  const d = new Date(raw);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return raw;
}
```

### 6. Angular Material Dropdown Filler
```javascript
async function fillAngularDropdown(el, value) {
  el.click();
  await sleep(500);
  // Options render in body overlay, not inline
  const options = document.querySelectorAll('mat-option, .cdk-option, .mat-option');
  for (const opt of options) {
    if (opt.innerText.trim().toLowerCase().includes(value.toLowerCase())) {
      opt.click();
      return true;
    }
  }
  return false;
}
```

### 7. Save Phase Loop (Fill → Save → Check → Fix → Retry)
```javascript
async function savePhaseWithRetry(phase, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Find save button
    const saveBtn = await findSaveButton();
    if (!saveBtn) return { success: false, error: 'Save button not found' };

    saveBtn.click();

    // Wait for result (max 10s)
    const result = await waitForSaveResult(10000);

    if (result.success) return { success: true };

    // Translate error
    const fix = translateError(result.error);

    if (fix.autoFixable) {
      await applyAutoFix(fix);
      await sleep(1000);
      continue; // Retry save
    }

    // Cannot auto-fix — pause for user
    await notifyPopup({ type: 'ERROR_NEEDS_USER', error: fix, phase });
    await waitForUserFix(); // Waits for popup message
    // Then continue loop to retry
  }
  return { success: false, error: 'Max retries exceeded' };
}
```

---

## 🗃️ MCA Field Dictionary (for field-matcher.js)

```json
{
  "cin":              ["cin", "corporate identification", "company identification number"],
  "companyName":      ["company name", "name of company", "entity name"],
  "auditorName":      ["auditor name", "name of auditor", "statutory auditor", "name of ca"],
  "auditorFirmName":  ["firm name", "firm of auditor", "ca firm", "name of firm"],
  "auditorPAN":       ["pan", "pan no", "pan number", "permanent account number"],
  "auditorMRN":       ["mrn", "membership", "membership number", "icai number", "registration number"],
  "auditorEmail":     ["email", "e-mail", "auditor email", "email id"],
  "auditorPhone":     ["phone", "mobile", "contact number", "telephone", "mobile number"],
  "agmDate":          ["agm date", "date of agm", "annual general meeting date", "date of annual general"],
  "appointmentDate":  ["appointment date", "date of appointment", "date of first appointment"],
  "auditorAddress":   ["address", "auditor address", "office address", "registered address"],
  "financialYear":    ["financial year", "fy", "year of appointment", "for the year"],
  "tenure":           ["tenure", "period", "years of appointment", "term"],
  "srn_adt1":         ["adt-1 srn", "srn of adt1", "auditor srn", "adt1 service request"],
  "balanceSheetDate": ["balance sheet date", "date of balance sheet", "as at date"],
  "paidUpCapital":    ["paid up capital", "paid-up share capital", "paid-up capital"],
  "registeredAddress":["registered office", "registered address", "office address"],
  "numberOfMembers":  ["number of members", "total members", "members as on"]
}
```

---

## ⚠️ MCA Error Translation Map (for error-engine.js)

```json
{
  "Company not found":        { "msg": "⚠️ CIN invalid or company is struck off", "fix": "FIX_CIN", "autoFixable": false },
  "Invalid date":             { "msg": "📅 Date format wrong. MCA needs DD/MM/YYYY", "fix": "FIX_DATE", "autoFixable": true },
  "Invalid date format":      { "msg": "📅 Date format wrong. MCA needs DD/MM/YYYY", "fix": "FIX_DATE", "autoFixable": true },
  "DSC not detected":         { "msg": "🔑 Plug in USB DSC token and run emSigner as Admin", "fix": "GUIDE_DSC", "autoFixable": false },
  "emBridge not running":     { "msg": "🔑 Start emBridge as Administrator", "fix": "GUIDE_DSC", "autoFixable": false },
  "Session expired":          { "msg": "⏱️ MCA portal timed out. Progress saved. Please login again.", "fix": "RESUME_AFTER_LOGIN", "autoFixable": false },
  "File size exceeds":        { "msg": "📎 PDF too large (>2MB). Auto-compress?", "fix": "COMPRESS_PDF", "autoFixable": true },
  "Attachment rejected":      { "msg": "📎 Filename has special characters. Auto-rename?", "fix": "RENAME_FILE", "autoFixable": true },
  "SRN not generated":        { "msg": "💳 Payment done but SRN delayed. Wait 24hrs, do NOT pay again.", "fix": "SAVE_TXNREF", "autoFixable": false },
  "Please try again":         { "msg": "🔄 MCA server busy. Retrying in 5 seconds...", "fix": "RETRY", "autoFixable": true },
  "ADT-1 SRN required":       { "msg": "⚠️ File ADT-1 first, then come back to AOC-4.", "fix": "GO_TO_ADT1", "autoFixable": false },
  "Invalid CIN format":       { "msg": "CIN format: L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits\nExample: U74999MH2010PTC123456", "fix": "FIX_CIN", "autoFixable": false },
  "This field is required":   { "msg": "A required field was missed. Re-filling now...", "fix": "REFILL_REQUIRED", "autoFixable": true },
  "Invalid DIN":              { "msg": "DIN must be exactly 8 digits.", "fix": "FIX_DIN", "autoFixable": false },
  "Invalid email":            { "msg": "Email format is invalid. Please check.", "fix": "FIX_EMAIL", "autoFixable": false },
  "TIMEOUT":                  { "msg": "⏱️ No response from MCA. Retrying...", "fix": "RETRY", "autoFixable": true }
}
```

---

## 🖥️ Dashboard Changes Needed

### 1. Add "Push to Extension" button in McaFormsHub.jsx
File: `dashboard/src/components/McaFormsHub.jsx`

```jsx
// Add this button to the form action bar
<button
  onClick={() => handlePushToExtension(formType, clientId, formData)}
  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  🚀 Push to Extension
</button>
```

### 2. Add pushToExtension to api.js
File: `dashboard/src/lib/api.js`

```javascript
export const pushToExtension = (data) =>
  fetch('http://localhost:4000/api/extension/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json());

export const getExtensionJobStatus = (jobId) =>
  fetch(`http://localhost:4000/api/extension/jobs/${jobId}`)
    .then(r => r.json());
```

---

## 🗃️ State Persistence Pattern

```javascript
// Save to chrome.storage.local after every phase
async function saveAutomationProgress(state) {
  await chrome.storage.local.set({
    [`job_${state.jobId}`]: {
      formType: state.formType,     // "ADT-1"
      clientId: state.clientId,     // "lessonboard"
      currentPhase: state.phase,    // 3
      totalPhases: state.total,     // 6
      completedFields: state.fields,// { cin: "U74...", auditorName: "..." }
      errors: state.errors,         // array of errors encountered
      savedAt: new Date().toISOString(),
      mcaUrl: window.location.href  // so we can navigate back
    }
  });
}

// On popup open — check for unfinished jobs
async function checkUnfinishedJobs() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([k]) => k.startsWith('job_'))
    .map(([, v]) => v)
    .filter(j => j.currentPhase < j.totalPhases);
}
```

---

## 📋 MCA Forms Reference

| Form | Purpose | Deadline | Penalty |
|---|---|---|---|
| ADT-1 | Auditor appointment | 15 days after AGM | 2x→12x multiplier |
| AOC-4 | Financial statements | 30 days after AGM | ₹100/day (no cap) |
| MGT-7/7A | Annual return | 60 days after AGM | ₹100/day (no cap) |
| INC-20A | Commencement of business | 180 days of incorporation | 2x→12x + strike-off risk |
| DIR-3 KYC | Director KYC | 30 Sep every year | ₹5,000 flat |
| INC-22 | Registered office | 30 days of event | 2x→12x |
| DIR-12 | Director change | 30 days of event | 2x→12x |

**Form Dependencies (must file in this order):**
1. ADT-1 → needed before AOC-4 (ADT-1 SRN required in AOC-4)
2. AOC-4 → needed before MGT-7 (financial data updates company size flags)
3. INC-20A → standalone, file within 180 days of incorporation

---

## 🛡️ Rules / Constraints

1. **Never** install external sqlite packages — use `node:sqlite` (Node 24 built-in)
2. **Never** show raw MCA errors to user — always translate via error-engine
3. **Never** use `element.value = x` to fill MCA form fields — use `setNativeValue()`
4. **Never** use hardcoded `setTimeout` for waiting — use `waitForElement()` with MutationObserver
5. **Always** save progress to `chrome.storage.local` after every phase
6. **Always** check if field is autofilled by MCA before attempting to fill it
7. **Always** normalize dates to DD/MM/YYYY before filling
8. **Always** validate CIN format before starting automation
9. Backend runs on **port 4000**, frontend on **port 5173**
10. Extension communicates with backend at `http://localhost:4000`

---

## 🎯 Current Build Priority (MVP Order)

```
Step 1: Backend — Add extension job routes to server.js
        POST /api/extension/push
        GET  /api/extension/jobs
        PUT  /api/extension/jobs/:id

Step 2: Dashboard — Add "Push to Extension" button in McaFormsHub.jsx
        Uses extensionConnector.js (already exists) or backend API

Step 3: Extension background.js — Add job polling loop
        Poll GET /api/extension/jobs every 5s
        When job "ready" → show badge + update side panel

Step 4: Extension popup UI — Add "Pending Jobs" section
        Show job card: form type, client name, [Start Automation] button

Step 5: Enhance field-mapper.js — Add 3-tier intelligent matching
        Tier 1: Existing exact selector match (already works)
        Tier 2: Fuzzy label match (new — add Dice coefficient)
        Tier 3: AI fallback via background.js → Claude API (new)

Step 6: Enhance error-handler.js — Add autoFixable + fix actions
        Add autoFixable flag to RULES array
        Add applyAutoFix() function for date/required-field/file errors

Step 7: Add session-watcher to content_script.js
        Detect MCA login redirect
        Save current state to chrome.storage.local
        Show "Resume" button in side panel after login

Step 8: Enhance phase-runner.js — Wire auto-fix into save loop
        After save failure → call ErrorHandler.getAutoFix()
        If autoFixable → applyFix() → retry save
        If not → pause → show ErrorPanel → wait for user

Step 9: Test full Dashboard → Extension → MCA flow with ADT-1 (Lessonboard)

Step 10: Add compliance calendar + deadline penalty calculator to side panel
```

## 📂 Key Client Data Format (clients/*.json)

```json
{
  "client": "Lessonboard Technologies Pvt Ltd",
  "cin": "U72900TN2019PTC133133",
  "fy": "2024-25",
  "form": "ADT-1",
  "auditor": {
    "name": "John Doe",
    "firmName": "M/s John & Associates",
    "pan": "ABCDE1234F",
    "mrn": "012345",
    "email": "john@audit.com",
    "phone": "9876543210",
    "address": "123 Anna Nagar, Chennai - 600040"
  },
  "agmDate": "2024-09-30",
  "appointmentDate": "2024-09-30",
  "financialYear": "2024-25",
  "tenure": "5"
}
```

---

## 🔗 Key Files to Read Before Editing

- `backend/server.js` — All existing routes, session auth, CORS config
- `backend/db.js` — Database schema, table definitions
- `dashboard/src/components/McaFormsHub.jsx` — Main form UI (most complex component)
- `dashboard/src/lib/api.js` — All existing API calls
- `dashboard/src/store/authStore.js` — Auth state management

---

*This context file is the single source of truth for the Germin8 project. Update it as the project evolves.*
