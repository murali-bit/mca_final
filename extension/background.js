importScripts("js/storage.js");

const SUPPORTED_FORMS = ["aoc4", "aoc4_offline", "spice_a", "inc32", "dir3", "adt1", "mgt7"];

// A company CIN: listed (L) or unlisted (U), 5-digit industry code, state, year, type, serial.
const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

// Clicking the toolbar icon opens the Germin8 side panel (docked on the browser's side).
// Unlike a popup it stays open while the user works on the MCA page. Set on every worker
// start so the behaviour survives extension reloads.
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function (e) {
    console.warn("Germin8: could not enable side panel on icon click:", e && e.message);
  });
}

chrome.runtime.onInstalled.addListener(function () {
  console.log("Germin8 v" + chrome.runtime.getManifest().version + " installed");
});

// ─── Dashboard job queue ────────────────────────────────────────────────────
// The dashboard scanner saves reviewed data as jobs on the local backend. The worker
// checks every 30s (Chrome's minimum alarm period); the open side panel asks more often.
const BACKEND_URL = "http://localhost:4000";
const JOB_ALARM = "germin8-job-poll";

chrome.alarms.create(JOB_ALARM, { periodInMinutes: 0.5, delayInMinutes: 0.05 });
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === JOB_ALARM) pollJobs();
});

async function backendJson(path, init) {
  const res = await fetch(BACKEND_URL + path, Object.assign({ cache: "no-store" }, init || {}));
  const body = await res.json();
  if (!res.ok || body.ok === false) throw new Error(body.message || "Backend error " + res.status);
  return body;
}

async function pollJobs() {
  try {
    const body = await backendJson("/api/extension/jobs");
    // Payloads stay on the backend until a job is loaded; the list only needs the summary.
    const jobs = (body.jobs || [])
      .filter(function (j) { return j.status === "ready" && SUPPORTED_FORMS.indexOf(j.form_type) >= 0; })
      .map(function (j) { return { id: j.id, formType: j.form_type, clientName: j.client_name, clientId: j.client_id, createdAt: j.created_at }; });
    await chrome.storage.local.set({ pendingJobs: jobs, jobsStatus: { ok: true, checkedAt: Date.now() } });
    setBadge(jobs.length);
    return { ok: true, count: jobs.length };
  } catch (e) {
    await chrome.storage.local.set({ jobsStatus: { ok: false, checkedAt: Date.now(), error: e.message } });
    return { ok: false, error: e.message };
  }
}

function setBadge(count) {
  chrome.action.setBadgeText({ text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#111111" });
}

async function setJobStatus(jobId, status) {
  return backendJson("/api/extension/jobs/" + encodeURIComponent(jobId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: status }),
  });
}

// Imports a queued job exactly like a direct dashboard send, then marks it started.
async function loadJob(jobId) {
  const job = (await backendJson("/api/extension/jobs/" + encodeURIComponent(jobId))).job;
  const payload = job.payload || {};
  const req = job.form_type === "aoc4" && payload.general
    ? { formType: "aoc4", client: payload }
    : { formType: job.form_type, formData: payload, clientInfo: job.client_id ? { id: job.client_id, name: job.client_name || job.client_id } : null };
  const stored = await storeImportedClient(req, "job:" + job.id);
  if (!stored.ok) return stored;
  // js/job-sync.js reports fill progress for this job while this client stays loaded.
  await chrome.storage.local.set({
    activeJob: { jobId: job.id, formType: stored.formType, clientKey: stored.id, clientName: job.client_name },
  });
  await setJobStatus(job.id, "started");
  await pollJobs();
  return Object.assign({ jobId: job.id }, stored);
}

// Service-worker scope error reporting — surfaces SW crashes to the popup
// drawer on next open.
self.addEventListener("error", function (e) {
  try {
    Storage.saveLogs({ level: "critical", code: "ERR_SW_INACTIVE", msg: "SW error: " + (e && e.message), ts: Date.now() });
  } catch (_) {}
});
self.addEventListener("unhandledrejection", function (e) {
  try {
    Storage.saveLogs({ level: "critical", code: "ERR_SW_INACTIVE", msg: "SW unhandledrejection: " + (e && e.reason && e.reason.message), ts: Date.now() });
  } catch (_) {}
});

chrome.runtime.onMessage.addListener(function (req, _sender, send) {
  if (!req || typeof req !== "object") return;
  try {
    if (req.action === "logAction") {
      Storage.saveLogs(req.data || {}).then(function () { send({ ok: true }); });
      return true;
    }
    if (req.action === "WRITE_LOG") {
      const entry = {
        level: req.level || "info",
        msg: req.message || "",
        code: req.code,
        source: req.source || "popup",
        ts: req.at || Date.now(),
        context: req.context || null,
      };
      Storage.saveLogs(entry).then(function () { send({ ok: true }); });
      return true;
    }
    if (req.action === "POLL_JOBS") {
      pollJobs().then(send);
      return true;
    }
    if (req.action === "LOAD_JOB") {
      loadJob(req.jobId).then(send, function (e) { send({ ok: false, error: e.message }); });
      return true;
    }
    if (req.action === "REPORT_JOB") {
      backendJson("/api/extension/jobs/" + encodeURIComponent(req.jobId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: req.status, phase: req.phase, result: req.result }),
      }).then(function () { send({ ok: true }); }, function (e) { send({ ok: false, error: e.message }); });
      return true;
    }
    if (req.action === "DISMISS_JOB") {
      setJobStatus(req.jobId, "cancelled").then(pollJobs).then(send, function (e) { send({ ok: false, error: e.message }); });
      return true;
    }
    if (req.action === "UPDATE_AUTOMATION_STEP") {
      const payload = {
        step: req.step,
        status: req.status,
        source: req.source || "unknown",
        message: req.message,
        detail: req.detail,
        error: req.error,
        at: Date.now(),
      };
      chrome.storage.local.set({ mcaAutomationStep: payload }, function () { send({ ok: true }); });
      return true;
    }
  } catch (e) {
    try { send({ ok: false, error: e.message }); } catch (_) {}
  }
});

// Allow the Dashboard (served from localhost) to hand prepared data straight
// to the extension across the supported forms (SUPPORTED_FORMS).
chrome.runtime.onMessageExternal.addListener(function (req, sender, send) {
  (async function () {
    try {
      const manifest = chrome.runtime.getManifest();
      if (req && req.action === "ping") {
        return send({ ok: true, name: manifest.name, version: manifest.version, supports: SUPPORTED_FORMS });
      }

      if (req && req.action === "importClient") {
        return send(await handleImportClient(req, sender));
      }

      send({ ok: false, error: 'Unknown action "' + (req && req.action) + '".' });
    } catch (e) {
      send({ ok: false, error: e.message });
    }
  })();
  return true; // async reply
});

async function handleImportClient(req, sender) {
  // Optional, backward-compatible: only enforced once a pairing key has been pasted into the
  // extension's "Dashboard pairing key" field (set from the dashboard's Settings, Extension).
  // Until then, externally_connectable's localhost match is the only gate, same as before.
  const pairingKey = await Storage.get("pairingKey");
  if (pairingKey && req.key !== pairingKey) {
    return { ok: false, error: "Pairing key missing or incorrect — this extension has a pairing key set and the dashboard did not send a matching one. Use the same key in both places: the dashboard's Pairing key box (Review & Send, or Settings, Extension, then Save settings) and this extension's Connection card." };
  }
  return storeImportedClient(req, sender.origin || sender.url || "");
}

// Validates and stores dashboard data under importedClients. Shared by direct sends
// (onMessageExternal) and jobs picked up from the backend queue.
async function storeImportedClient(req, from) {
  const formType = SUPPORTED_FORMS.indexOf(req.formType) >= 0 ? req.formType : "aoc4";

  // Legacy AOC-4 shape: a nested client with general.CIN.
  const legacyClient = req.client;
  const flatFormData = req.formData || null;
  const clientInfo = req.clientInfo || null;

  if (formType === "aoc4" && legacyClient && typeof legacyClient === "object" && !flatFormData) {
    if (!legacyClient.general || !legacyClient.general.CIN) {
      return { ok: false, error: "This is not an AOC-4 client file (no general.CIN)." };
    }
    const fallbackId = legacyClient.general.CIN + "_" + String(legacyClient.general.FY_TO || "").replace(/\D/g, "");
    const id = String(legacyClient.clientId || fallbackId).toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const stored = await chrome.storage.local.get(["importedClients"]);
    const imported = stored.importedClients || {};
    const replaced = !!imported[id];
    imported[id] = legacyClient;
    const info = {
      id: id,
      name: legacyClient.displayName || id,
      cin: legacyClient.general.CIN,
      fy: { from: legacyClient.general.FY_FROM, to: legacyClient.general.FY_TO },
      source: "dashboard",
    };
    await chrome.storage.local.set({
      importedClients: imported,
      currentForm: "aoc4",
      clientInfo: info,
    });
    await Storage.saveLogs({ action: "importClientFromDashboard", id: id, replaced: replaced, formType: "aoc4", from: from });
    return { ok: true, id: id, replaced: replaced, name: info.name, formType: "aoc4" };
  }

  // New shape — flat formData per form.
  if (!flatFormData || typeof flatFormData !== "object") {
    return { ok: false, error: "Missing formData for " + formType + "." };
  }
  const validationErr = validateFormData(formType, flatFormData, clientInfo);
  if (validationErr) return { ok: false, error: validationErr };

  let info;
  if (formType === "adt1") {
    // Store the CIN the way the extension's own CIN check wants it (the form fill reads data.cin).
    flatFormData.cin = String(flatFormData.cin || flatFormData.CIN).trim().toUpperCase();
    delete flatFormData.CIN;
    // The dashboard's clientInfo may leave out id/name/cin; fall back to what the data itself says.
    info = Object.assign({}, inferClientInfo(formType, flatFormData), clientInfo || {});
    const inferred = inferClientInfo(formType, flatFormData);
    if (!info.id) info.id = inferred.id;
    if (!info.name) info.name = inferred.name;
    if (!info.cin) info.cin = inferred.cin;
  } else {
    info = clientInfo || inferClientInfo(formType, flatFormData);
  }
  const id = String((info && info.id) || (info && info.cin) || Date.now())
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  const stored = await chrome.storage.local.get(["importedClients"]);
  const imported = stored.importedClients || {};
  imported[id] = { clientInfo: info, formType: formType, formData: flatFormData, importedAt: Date.now() };

  const toSet = {
    importedClients: imported,
    currentForm: formType,
    clientInfo: info,
  };
  toSet["mcaFormData_" + formType] = flatFormData;
  await chrome.storage.local.set(toSet);
  await Storage.saveLogs({ action: "importClientFromDashboard", id: id, formType: formType, keys: Object.keys(flatFormData).length, from: from });
  return { ok: true, id: id, formType: formType, name: info.name, storedKeys: Object.keys(flatFormData) };
}

function validateFormData(formType, formData, clientInfo) {
  switch (formType) {
    case "aoc4":
    case "aoc4_offline": {
      const cin = (clientInfo && clientInfo.cin) || formData.cin || formData.CIN;
      if (!cin) return "Missing CIN for " + formType + ".";
      return null;
    }
    case "spice_a": {
      if (!formData.proposedName1) return "Missing proposedName1 for SPICe+ Part A.";
      return null;
    }
    case "inc32": {
      const cin = (clientInfo && clientInfo.cin) || formData.cin || formData.CIN;
      if (!cin && !formData.proposedName1) return "Missing CIN or proposedName1 for INC-32.";
      return null;
    }
    case "dir3": {
      if (!formData.din) return "Missing DIN for DIR-3 KYC.";
      return null;
    }
    case "mgt7": {
      const cin = (clientInfo && clientInfo.cin) || formData.cin || formData.CIN;
      if (!cin) return "Missing CIN for MGT-7.";
      return null;
    }
    case "adt1": {
      // Phase 1 types this CIN into MCA, so it has to be a real-looking one.
      const raw = formData.cin || formData.CIN;
      if (!raw) return "Missing cin for ADT-1.";
      const cin = String(raw).trim().toUpperCase();
      if (!CIN_RE.test(cin)) return 'ADT-1 cin "' + cin + '" is not a valid 21-character CIN (for example U12345MH2020PTC123456).';
      return null;
    }
    default:
      return "Unsupported formType " + formType + ".";
  }
}

function inferClientInfo(formType, formData) {
  if (formType === "adt1") {
    const cin = String(formData.cin || formData.CIN || "").trim().toUpperCase();
    return {
      id: String(formData.clientId || cin || "adt1_" + Date.now()).toLowerCase(),
      name: formData.displayName || formData.companyName || formData.firmName || cin || "ADT-1 entry",
      cin: cin || null,
      din: null,
      fy: formData.periodFrom && formData.periodTo ? { from: formData.periodFrom, to: formData.periodTo } : null,
      source: "dashboard",
    };
  }
  return {
    id: formData.clientId || formData.cin || formData.din || "manual_" + Date.now(),
    name: formData.displayName || formData.name || formData.companyName || formData.proposedName1 || "Imported entry",
    cin: formData.cin || formData.CIN || null,
    din: formData.din || null,
    fy: formData.financialYearFrom && formData.financialYearTo
      ? { from: formData.financialYearFrom, to: formData.financialYearTo }
      : null,
    source: "dashboard",
  };
}
