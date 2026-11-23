let currentData = null;    // flat {KEY: value}
let currentClient = null;  // meta
let clientsIndex = null;
let clientLoadInProgress = false;
let fillInProgress = false;
// The UI lives in the browser side panel, which stays open while the user works on the MCA page,
// so a fill runs right here. The MCA tab is looked up when a run starts and then kept for the whole
// run (windowMode makes getActiveMcaTab() stick to RUN.tabId even if the user switches tabs).
const RUN = { windowMode: true, tabId: null };

// The form currently chosen in the Form dropdown (kept in sync via "germin8:formchange").
let activeForm = 'aoc4';
// Data textarea of each simplified (non-AOC-4) form; the Client dropdown fills these.
const FORM_TEXTAREA = {
  aoc4_offline: 'aoc4OffFormData',
  spice_a: 'spiceAFormData',
  inc32: 'inc32FormData',
  dir3: 'dir3FormData',
  mgt7: 'mgt7FormData',
  adt1: 'adt1FormData',
};
const FORM_LABEL = { aoc4: 'AOC-4', aoc4_offline: 'AOC-4 Offline', spice_a: 'SPICe+ Part A', inc32: 'INC-32', dir3: 'DIR-3 KYC', mgt7: 'MGT-7', adt1: 'ADT-1' };

window.addEventListener('germin8:formchange', e => {
  activeForm = (e.detail && e.detail.form) || 'aoc4';
  rebuildClientSelect();
});

// The data card's inline editor saved new values: keep this form's data box (and, for AOC-4, the
// values the next fill will use) in step with them.
window.addEventListener('germin8:datachange', e => {
  const { form, data } = e.detail || {};
  if (!form || !data) return;
  const box = document.getElementById(FORM_TEXTAREA[form]);
  if (box) box.value = JSON.stringify(data, null, 2);
  if (form === 'aoc4') {
    currentData = data;
    if (document.getElementById('tab-preview').classList.contains('active')) displayFieldList(currentData);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Wire up the shared UI first so toasts/timeline/error-panel are ready before anything fires.
  await initChrome();

  bindTabs();
  bindMain();
  bindPdf();
  bindMultiFormWorkflows();
  bindMcaStatus();
  bindAccount();
  const ps = document.getElementById('phaseSelect');
  for (const p of PHASES) ps.add(new Option(p.label, p.id));
  ps.addEventListener('change', () => { if (currentData) displayFieldList(currentData); });
  await loadClientsIndex();
  bindDashboardSync();
  bindJobInbox();
});

/* ---------- Jobs pushed from the dashboard (backend queue) ---------- */
// background.js owns the queue (alarm every 30s + badge); while this panel is open it asks
// every few seconds so a push from the dashboard shows up almost immediately.
const JOB_POLL_MS = 5000;

function bindJobInbox() {
  const list = document.getElementById('jobsList');
  if (!list) return;
  const refresh = () => chrome.storage.local.get(['pendingJobs', 'jobsStatus'])
    .then(r => renderJobs(r.pendingJobs || [], r.jobsStatus));
  refresh();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.pendingJobs || changes.jobsStatus)) refresh();
  });
  const poll = () => chrome.runtime.sendMessage({ action: 'POLL_JOBS' }).catch(() => {});
  poll();
  setInterval(poll, JOB_POLL_MS);
  list.addEventListener('click', e => {
    const btn = e.target.closest('button[data-job]');
    if (!btn) return;
    if (btn.dataset.act === 'load') loadPushedJob(btn.dataset.job, btn);
    else dismissPushedJob(btn.dataset.job, btn);
  });
}

// Backend timestamps are SQLite CURRENT_TIMESTAMP: UTC "YYYY-MM-DD HH:MM:SS".
function jobAge(ts) {
  const t = Date.parse(String(ts || '').replace(' ', 'T') + 'Z');
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function renderJobs(jobs, status) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = document.getElementById('jobsList');
  list.innerHTML = jobs.map(j => `
    <li class="job-item">
      <div class="job-main">
        <span class="job-name" title="${esc(j.clientName || j.clientId)}">${esc(j.clientName || j.clientId || 'Untitled')}</span>
        <span class="job-sub"><span class="job-form">${esc(FORM_LABEL[j.formType] || j.formType)}</span> · ${esc(jobAge(j.createdAt))}</span>
      </div>
      <button class="small primary" data-act="load" data-job="${esc(j.id)}">Load</button>
      <button class="small ghost" data-act="dismiss" data-job="${esc(j.id)}" title="Remove this job from the queue">Dismiss</button>
    </li>`).join('');

  const count = document.getElementById('jobsCount');
  count.textContent = String(jobs.length);
  count.classList.toggle('hidden', !jobs.length);

  const st = document.getElementById('jobsStatus');
  const offline = status && status.ok === false;
  st.textContent = !status ? 'Checking…' : offline ? 'Backend offline' : 'Connected';
  st.classList.toggle('ok', !!(status && status.ok));
  st.classList.toggle('bad', !!offline);

  const empty = document.getElementById('jobsEmpty');
  empty.textContent = offline
    ? 'Dashboard backend not reachable at localhost:4000. Start it with: node backend/server.js'
    : 'No jobs waiting. Scan and review a document in the dashboard, then click Push to Extension.';
  empty.classList.toggle('hidden', jobs.length > 0);
}

async function loadPushedJob(jobId, btn) {
  if (fillInProgress || clientLoadInProgress) return showMessage('error', 'Wait for the current fill to finish before loading another job.');
  btn.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ action: 'LOAD_JOB', jobId });
    if (!res || !res.ok) throw new Error((res && res.error) || 'No response from the extension');
    importedClients = (await Storage.get('importedClients')) || {};
    if (window.FormPicker) await window.FormPicker.pick(res.formType);
    activeForm = res.formType;
    rebuildClientSelect(res.id);
    if (res.formType === 'aoc4') {
      document.getElementById('phaseSelect').value = '1';
      await onLoadClient(false);
    } else {
      await loadFormClient(res.formType, res.id);
    }
  } catch (err) {
    btn.disabled = false;
    showMessage('error', `Could not load the job: ${err.message}`, 10000);
  }
}

async function dismissPushedJob(jobId, btn) {
  btn.disabled = true;
  const res = await chrome.runtime.sendMessage({ action: 'DISMISS_JOB', jobId }).catch(e => ({ ok: false, error: e.message }));
  if (!res || !res.ok) {
    btn.disabled = false;
    showMessage('error', `Could not dismiss the job: ${(res && res.error) || 'no response'}`, 8000);
  }
}

async function initChrome() {
  try {
    if (window.Toasts) { /* ready */ }
    if (window.ErrorPanel && typeof window.ErrorPanel.bind === 'function') window.ErrorPanel.bind();
    if (window.DataCard && typeof window.DataCard.bind === 'function') window.DataCard.bind();
    if (window.FieldExtractor) window.FieldExtractor.bind();
    if (window.PageProbe) window.PageProbe.bind();
    if (window.RunStatus && window.OfflineEngine) window.RunStatus.bind();
    if (window.ErrorHandler && typeof window.ErrorHandler.installPopupListeners === 'function') {
      window.ErrorHandler.installPopupListeners();
    }
    if (window.FormPicker && typeof window.FormPicker.init === 'function') activeForm = await window.FormPicker.init();
  } catch (err) {
    console.error('UI init failed', err);
  }
}

// Header chip: is an MCA page open? Updates as the user switches tabs or navigates.
function bindMcaStatus() {
  const chip = document.getElementById('mcaChip');
  const text = document.getElementById('mcaChipText');
  if (!chip || !text) return;
  const MCA = /mca\.gov\.in/;
  const MCA_PATTERNS = ['https://www.mca.gov.in/*', 'https://*.mca.gov.in/*'];
  const set = (state, label) => { chip.dataset.state = state; text.textContent = label; };
  const refresh = async () => {
    try {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active && active.url && MCA.test(active.url)) return set('on', 'MCA page open');
      const any = await chrome.tabs.query({ url: MCA_PATTERNS });
      set(any.length ? 'other' : 'off', any.length ? 'MCA in another tab' : 'No MCA tab');
    } catch (_) { set('off', 'No MCA tab'); }
  };
  refresh();
  const t = chrome.tabs;
  if (t.onActivated) t.onActivated.addListener(refresh);
  if (t.onRemoved) t.onRemoved.addListener(refresh);
  if (t.onUpdated) t.onUpdated.addListener((_id, info) => { if (info.status === 'complete' || info.url) refresh(); });
  if (chrome.windows && chrome.windows.onFocusChanged) chrome.windows.onFocusChanged.addListener(refresh);
}

// Pairing key: a shared secret with the Germin8 dashboard (generated there, under Settings,
// Extension, Pairing key). Stored under the same key name background.js checks on every
// importClient message — see handleImportClient()'s pairing-key check.
function bindAccount() {
  const keyInput = document.getElementById('acctKeyInput');
  const saveBtn = document.getElementById('acctSaveBtn');
  const statusEl = document.getElementById('acctKeyStatus');

  function render(key) {
    keyInput.value = key || '';
    statusEl.textContent = key ? 'Set' : 'Not set';
    statusEl.dataset.state = key ? 'ok' : 'warn';
  }

  saveBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    await Storage.save('pairingKey', key || null);
    render(key);
    if (window.Toasts) Toasts.success({ title: key ? 'Pairing key saved' : 'Pairing key cleared' });
  });
  keyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });

  (async () => render(await Storage.get('pairingKey')))();
}

// Starts the fill. Forgetting the previous run's tab makes getActiveMcaTab() pick the MCA tab the
// user is on now; it then stays fixed for the duration of this run.
async function startRun() {
  RUN.tabId = null;
  return doFill();
}

function bindTabs() {
  // Only the AOC-4 workflow uses the tabbed Client/PDF/Preview rail.
  document.querySelectorAll('#aoc4Workflow .tab').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
}
function switchTab(name) {
  const scope = document.getElementById('aoc4Workflow');
  if (!scope) return;
  scope.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  scope.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'preview' && currentData) displayFieldList(currentData);
}

/* ---------- Clients ---------- */
let importedClients = {};
async function loadClientsIndex() {
  try {
    const url = chrome.runtime.getURL('clients/index.json');
    // clients/ is local-only (gitignored); a fresh copy has no index, which just means no bundled clients.
    const res = await fetch(url).catch(() => null);
    clientsIndex = res && res.ok ? await res.json() : { firm: 'Germin8', clients: [] };
    // "Germin8 Advisors / Jain S A K & Co." is too long for the header line: show the first name only.
    if (clientsIndex.firm) document.getElementById('ctxFirm').textContent = clientsIndex.firm.split(' / ')[0];
    importedClients = (await Storage.get('importedClients')) || {};
    rebuildClientSelect();
  } catch (e) {
    showMessage('error', `Clients index load failed: ${e.message}`);
  }
}

// An imported entry belongs to one form. Legacy AOC-4 client files carry no formType.
const entryForm = entry => (entry && entry.formType) || 'aoc4';

// Bundled clients (clients/index.json) belong to one form; entries without a formType are AOC-4.
const bundledFor = form => (clientsIndex?.clients || []).filter(c => entryForm(c) === form);

// Lists the clients that can be used with the form chosen in the Form dropdown: the bundled ones
// for that form, plus what was imported or sent from the dashboard for it.
function rebuildClientSelect(selectedId) {
  const sel = document.getElementById('clientSelect');
  const isAoc4 = activeForm === 'aoc4';
  const bundledList = bundledFor(activeForm);
  sel.innerHTML = '';
  sel.add(new Option(isAoc4 || bundledList.length ? '— choose a client —' : '— enter data manually —', ''));
  if (bundledList.length) {
    const bundled = document.createElement('optgroup');
    bundled.label = 'Bundled';
    for (const c of bundledList) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = String(c.name).includes(c.fy) ? c.name : `${c.name} — FY ${c.fy}`;
      bundled.appendChild(opt);
    }
    if (bundled.children.length) sel.appendChild(bundled);
  }
  const ids = Object.keys(importedClients).filter(id => entryForm(importedClients[id]) === activeForm);
  if (ids.length) {
    const grp = document.createElement('optgroup');
    grp.label = 'Imported from dashboard';
    for (const id of ids) {
      const opt = document.createElement('option');
      opt.value = id;
      // Imported entries can now be either the legacy raw client JSON or the
      // new {clientInfo, formType, formData} envelope.
      const entry = importedClients[id];
      const name = entry?.clientInfo?.name || entry?.displayName || id;
      opt.textContent = name;
      grp.appendChild(opt);
    }
    sel.appendChild(grp);
  }
  if (selectedId) sel.value = selectedId;
  toggleRemoveBtn();
}

function clientMeta(id) {
  const bundled = (clientsIndex?.clients || []).find(c => c.id === id);
  if (bundled) return bundled;
  if (importedClients[id]) {
    const entry = importedClients[id];
    const name = entry?.clientInfo?.name || entry?.displayName || id;
    return { id, name, imported: true };
  }
  return null;
}

function toggleRemoveBtn() {
  const id = document.getElementById('clientSelect').value;
  document.getElementById('removeClientBtn').classList.toggle('hidden', !importedClients[id]);
}

function bindMain() {
  document.getElementById('loadBtn').addEventListener('click', () => onLoadClient(true));
  document.getElementById('clientSelect').addEventListener('change', () => {
    toggleRemoveBtn();
    const id = document.getElementById('clientSelect').value;
    if (activeForm !== 'aoc4') return loadFormClient(activeForm, id);
    if (!id || fillInProgress) return;
    document.getElementById('phaseSelect').value = '1';
    onLoadClient(false);
  });
  document.getElementById('fillBtn').addEventListener('click', onFill);
  document.getElementById('confirmBtn').addEventListener('click', startRun);
  document.getElementById('cancelBtn').addEventListener('click', () => switchTab('main'));

  document.getElementById('importClientBtn').addEventListener('click', () => document.getElementById('importClientInput').click());
  document.getElementById('importClientInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (activeForm !== 'aoc4') return await importFormClient(activeForm, json, file.name);
      if (!json?.general?.CIN) throw new Error('this is not an AOC-4 client JSON (no general.CIN)');
      const id = String(json.clientId || file.name.replace(/\.json$/i, '')).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      importedClients[id] = json;
      await Storage.save('importedClients', importedClients);
      // Also publish a normalized clientInfo so the data card can light up.
      try {
        await chrome.storage.local.set({ clientInfo: {
          id, name: json.displayName || id, cin: json.general.CIN,
          fy: { from: json.general.FY_FROM, to: json.general.FY_TO },
          source: 'imported',
        }});
        if (window.DataCard) window.DataCard.render('aoc4');
      } catch (_) {}
      await Storage.saveLogs({ action: 'importClient', id, file: file.name, keys: Object.keys(json).length });
      rebuildClientSelect(id);
      document.getElementById('phaseSelect').value = '1';
      showMessage('success', `Imported ${json.displayName || id}. Open the AOC-4 form on MCA, then click Load & Fill All Phases.`, 12000);
      if (window.Toasts) window.Toasts.success({ title: 'Client imported', body: json.displayName || id });
    } catch (err) {
      showMessage('error', `Import failed: ${err.message}`, 12000);
      if (window.Toasts) window.Toasts.error({ title: 'Import failed', body: err.message });
    }
  });
  document.getElementById('removeClientBtn').addEventListener('click', async () => {
    const id = document.getElementById('clientSelect').value;
    if (!importedClients[id]) return;
    delete importedClients[id];
    await Storage.save('importedClients', importedClients);
    rebuildClientSelect();
    showMessage('info', 'Imported client removed.');
    if (window.Toasts) window.Toasts.info({ title: 'Imported client removed' });
  });
}

// Non-AOC-4 forms: put the chosen client's saved data into that form's data box and the data card.
async function loadFormClient(formType, id) {
  if (!id) return;
  let entry = importedClients[id];
  // A bundled client is always read fresh from its file in the extension folder. An older imported or
  // saved copy with the same id must not shadow it, or edits to the file never reach the form.
  const bundledMeta = bundledFor(formType).find(c => c.id === id);
  try {
    if (bundledMeta) {
      const res = await fetch(chrome.runtime.getURL(bundledMeta.file));
      entry = await res.json();
      entry.clientInfo = Object.assign({}, entry.clientInfo, { source: 'bundled' });
    }
    if (!entry || !entry.formData) return;
    const box = document.getElementById(FORM_TEXTAREA[formType]);
    if (box) box.value = JSON.stringify(entry.formData, null, 2);
    await chrome.storage.local.set({
      ['mcaFormData_' + formType]: entry.formData,
      clientInfo: Object.assign({ source: 'imported' }, entry.clientInfo || {}),
    });
    if (window.DataCard) window.DataCard.render(formType);
    if (window.Toasts) window.Toasts.success({ title: 'Client data loaded', body: (entry.clientInfo && entry.clientInfo.name) || id });
  } catch (err) {
    if (window.ErrorHandler) window.ErrorHandler.handle(err, { source: 'loadFormClient' });
    else if (window.Toasts) window.Toasts.error({ title: 'Could not load client', body: err.message });
  }
}

// Non-AOC-4 forms: Import JSON takes a flat {field: value} file and files it under that form.
async function importFormClient(formType, json, fileName) {
  // A file exported by the Germin8 dashboard wraps the values: { formType, clientInfo, formData }.
  let info = null;
  if (json && json.formData && typeof json.formData === 'object' && !Array.isArray(json.formData)) {
    info = json.clientInfo || null;
    json = json.formData;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json) || !Object.keys(json).length) {
    throw new Error('expected a JSON object with the ' + FORM_LABEL[formType] + ' field values');
  }
  const name = (info && info.name) || json.displayName || json.name || json.companyName || json.proposedName1 || fileName.replace(/\.json$/i, '');
  const id = String((info && info.id) || json.clientId || fileName.replace(/\.json$/i, '')).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  importedClients[id] = {
    clientInfo: Object.assign({ id, name, cin: json.cin || json.CIN || null, din: json.din || null, source: 'imported' }, info || {}),
    formType, formData: json, importedAt: Date.now(),
  };
  await Storage.save('importedClients', importedClients);
  rebuildClientSelect(id);
  await loadFormClient(formType, id);
}

async function onLoadClient(fillAfter = true, startPhase = 1) {
  if (clientLoadInProgress || fillInProgress) return;
  const id = document.getElementById('clientSelect').value;
  if (!id) return showMessage('error', 'Pick a client.');
  const meta = clientMeta(id);
  if (!meta) return showMessage('error', 'Client not found.');

  clientLoadInProgress = true;
  const loadBtn = document.getElementById('loadBtn');
  loadBtn.disabled = true;
  try {
    let client;
    if (meta.imported) {
      // Imported entries can be either the raw client JSON (legacy) or the
      // new {clientInfo, formType, formData} envelope — unwrap transparently.
      const entry = importedClients[id];
      client = entry && entry.formData ? entry.formData : entry;
    } else {
      const res = await fetch(chrome.runtime.getURL(meta.file));
      client = await res.json();
    }
    currentClient = client;
    currentData = flattenClient(client);
    await Storage.save('lastClient', { id: meta.id, data: currentData });
    await Storage.saveLogs({ action: 'loadClient', id: meta.id, keys: Object.keys(currentData).length });

    // Publish the loaded client for the data card.
    try {
      await chrome.storage.local.set({
        clientInfo: {
          id: meta.id,
          name: client.displayName || meta.name,
          cin: client.general?.CIN || currentData.CIN,
          fy: { from: client.general?.FY_FROM, to: client.general?.FY_TO },
          source: meta.imported ? 'imported' : 'bundled',
        },
        mcaFormData_aoc4: currentData,
      });
      if (window.DataCard) window.DataCard.render('aoc4');
    } catch (_) {}

    document.getElementById('fillBtn').disabled = false;
    document.getElementById('phaseSelect').value = String(startPhase);
    switchTab('preview');
    if (!fillAfter) {
      showMessage('success', `Loaded ${Object.keys(currentData).length} values. Open the AOC-4 form on MCA, then click Load & Fill All Phases.`, 10000);
      return;
    }
    if (document.getElementById('showPreview').checked) {
      showMessage('success', `Loaded ${Object.keys(currentData).length} values. Review them, then click Confirm & Fill to start all phases.`);
      return;
    }
    showMessage('success', `Loaded ${Object.keys(currentData).length} values. Starting automatic fill from Phase ${startPhase}…`, 12000);
    await startRun();
  } catch (e) {
    showMessage('error', `Load failed: ${e.message}`);
    if (window.ErrorHandler) window.ErrorHandler.handle(e, { source: 'loadClient' });
  } finally {
    clientLoadInProgress = false;
    loadBtn.disabled = false;
  }
}

async function onFill() {
  if (!currentData) {
    const last = await Storage.get('lastClient');
    if (last) currentData = last.data;
  }
  if (!currentData) return showMessage('error', 'Load a client first.');

  if (document.getElementById('showPreview').checked) {
    switchTab('preview');
    displayFieldList(currentData);
    return;
  }
  await startRun();
}

async function ensureInjected(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    if (res && res.pong) return;
  } catch (_) { /* fall through and inject */ }
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    world: 'ISOLATED',
    files: [
      'js/field-maps/_shared.js',
      'js/field-maps/aoc4.js',
      'js/field-maps/aoc4-offline.js',
      'js/field-maps/spice-a.js',
      'js/field-maps/inc32.js',
      'js/field-maps/dir3.js',
      'js/field-maps/mgt7.js',
      'js/field-maps/adt1.js',
      'js/forms-registry.js',
      'js/filler.js',
      'content_script.js',
    ],
  });
  await new Promise(r => setTimeout(r, 150));
}

/* ---------- PDF (ad-hoc) ---------- */
function bindPdf() {
  document.getElementById('extractBtn').addEventListener('click', async () => {
    const f = document.getElementById('pdfInput').files[0];
    if (!f) return showMessage('error', 'Pick a PDF first.');
    try {
      const raw = await PDFExtractor.extractText(f);
      document.getElementById('pdfRaw').textContent = raw.slice(0, 50000);
      showMessage('success', `Extracted ${raw.length} chars.`);
      await Storage.saveLogs({ action: 'pdfExtract', chars: raw.length });
    } catch (e) {
      showMessage('error', `Extract failed: ${e.message}`);
    }
  });
}

/* ---------- Multi-form workflows (AOC-4 Offline / SPICe+ A / INC-32 / DIR-3) ---------- */
function bindMultiFormWorkflows() {
  const wire = (fillId, scanId, textareaId, formType, friendly) => {
    const fillBtn = document.getElementById(fillId);
    const scanBtn = document.getElementById(scanId);
    const ta = document.getElementById(textareaId);
    if (!fillBtn || !ta) return;

    // Seed the textarea from existing stored form data when the user picks that pill.
    chrome.storage.local.get(['mcaFormData_' + formType], res => {
      const stored = res && res['mcaFormData_' + formType];
      if (stored && Object.keys(stored).length) ta.value = JSON.stringify(stored, null, 2);
    });

    // Forms with a Stop button (currently MGT-7): Fill is locked and Stop shown while a run is on.
    const stopBtn = document.getElementById(AEM_STOP_BUTTON[formType] || '');
    if (stopBtn) stopBtn.addEventListener('click', async () => {
      stopBtn.disabled = true;
      await stopAemFill();
      if (window.Toasts) window.Toasts.info({ title: 'Stopping', body: 'The ' + friendly + ' fill stops after the field it is writing now.' });
    });
    fillBtn.addEventListener('click', async () => {
      if (stopBtn) { fillBtn.disabled = true; stopBtn.disabled = false; stopBtn.classList.remove('hidden'); }
      try {
        await runMultiFormFill(formType, friendly, ta);
      } finally {
        if (stopBtn) { fillBtn.disabled = false; stopBtn.classList.add('hidden'); AEM_RUN.tabId = null; }
      }
    });
    if (scanBtn) scanBtn.addEventListener('click', async () => {
      await runMultiFormScan(formType, friendly);
    });
  };

  wire('aoc4OffFillBtn', 'aoc4OffScanBtn', 'aoc4OffFormData', 'aoc4_offline', 'AOC-4 Offline');
  wire('spiceAFillBtn',   'spiceAScanBtn',   'spiceAFormData',   'spice_a',      'SPICe+ Part A');
  wire('inc32FillBtn',    'inc32ScanBtn',    'inc32FormData',    'inc32',        'INC-32');
  wire('dir3FillBtn',     'dir3ScanBtn',     'dir3FormData',     'dir3',         'DIR-3 KYC');
  wire('mgt7FillBtn',     'mgt7ScanBtn',     'mgt7FormData',     'mgt7',         'MGT-7');
  const mgt7CheckBtn = document.getElementById('mgt7CheckBtn');
  if (mgt7CheckBtn) mgt7CheckBtn.addEventListener('click', async () => {
    let data;
    try { data = JSON.parse((document.getElementById('mgt7FormData').value || '').trim() || '{}'); }
    catch (err) { if (window.Toasts) window.Toasts.error({ title: 'Invalid JSON', body: err.message }); return; }
    const r = await runMgt7Checks(data);
    if (r && window.Toasts) {
      const t = r.errors.length ? 'error' : r.warnings.length ? 'warning' : 'success';
      (window.Toasts[t] || window.Toasts.info)({ title: 'MGT-7 pre-filing check', body: r.errors.length + ' error(s), ' + r.warnings.length + ' warning(s)' + (r.variant ? ' — form: ' + r.variant : '') });
    }
  });
  wire('adt1FillBtn',     'adt1ScanBtn',     'adt1FormData',     'adt1',         'ADT-1');
  bindAdt1Start();
  bindAdt1Attachments();
  bindSrnCleanup();
}

/* ---------- Cancel pending SRNs: bulk clean-up of drafts on MCA's My Application page ---------- */
let srnRunning = false, srnStop = false;
function bindSrnCleanup() {
  const $ = id => document.getElementById(id);
  const scanBtn = $('srnScanBtn'), runBtn = $('srnRunBtn'), stopBtn = $('srnStopBtn');
  if (!scanBtn || !runBtn || !window.SrnCleanup) return;
  const summary = $('srnSummary'), list = $('srnResult');
  const say = t => { summary.textContent = t; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const addRow = (label, cls, text) => {
    const li = document.createElement('li');
    li.innerHTML = '<div class="ex-main"><span class="ex-label">' + esc(label) + '</span></div><span class="ex-tags"><em class="' + cls + '">' + esc(text) + '</em></span>';
    list.prepend(li);
  };
  const opts = () => ({ filter: $('srnFilter').value.trim(), max: Math.max(0, parseInt($('srnMax').value, 10) || 0) });
  const setBusy = b => { srnRunning = b; scanBtn.disabled = b; runBtn.disabled = b; stopBtn.classList.toggle('hidden', !b); };

  scanBtn.addEventListener('click', async () => {
    if (srnRunning) return;
    setBusy(true); list.innerHTML = ''; say('Opening My Application and reading the Pending for Action list…');
    try {
      const { tab, created } = await window.SrnCleanup.findTab();
      if (created) say('Opened MCA in a new tab. Sign in there, then press Scan again.');
      const r = await window.SrnCleanup.scan(tab.id, opts());
      say(r.message);
      for (const g of (r.groups || []).slice(0, 25)) addRow(g.label, 'warn', g.count + ' draft' + (g.count === 1 ? '' : 's'));
    } catch (e) { say('Scan failed: ' + e.message); }
    finally { setBusy(false); }
  });

  stopBtn.addEventListener('click', () => { srnStop = true; say('Stopping after the current cancel…'); stopBtn.disabled = true; });

  runBtn.addEventListener('click', async () => {
    if (srnRunning) return;
    if (!$('srnConfirm').checked) { say('Tick "I understand that cancelled SRNs cannot be restored" first.'); return; }
    setBusy(true); srnStop = false; stopBtn.disabled = false; list.innerHTML = '';
    try {
      const { tab, created } = await window.SrnCleanup.findTab();
      if (created) { say('Opened MCA in a new tab. Sign in there, then press the button again.'); return; }
      say('Counting the drafts first…');
      const pre = await window.SrnCleanup.scan(tab.id, opts());
      if (!pre.ok) { say(pre.message); return; }
      if (!pre.eligible) { say(pre.message); return; }
      const n = opts().max > 0 ? Math.min(opts().max, pre.eligible) : pre.eligible;
      if (!confirm('Cancel ' + n + ' pending draft SRN(s) on MCA?\n\nThis cannot be undone. Rows that are not "Draft/Pending Submission" are left alone.')) { say('Nothing was cancelled.'); return; }
      const out = await window.SrnCleanup.run(tab.id, Object.assign(opts(), { isCancelled: () => srnStop }), ev => {
        if (ev.state === 'done') addRow(ev.text, 'ok', 'cancelled');
        else if (ev.state === 'warn') addRow(ev.text, 'warn', 'retry');
        else say(ev.text + (ev.cancelled ? ' · ' + ev.cancelled + ' cancelled so far' : ''));
      });
      say(out.message);
      if (window.Toasts) {
        if (out.ok) window.Toasts.success({ title: 'SRN clean-up finished', body: out.message });
        else window.Toasts.error({ title: 'SRN clean-up stopped', body: out.message });
      }
      await Storage.saveLogs({ action: 'cancelSrn', ok: out.ok, cancelled: out.cancelled, message: out.message });
    } catch (e) { say('Stopped: ' + e.message); }
    finally { setBusy(false); }
  });
}

/* ---------- ADT-1 attachments: PDFs chosen here are uploaded into MCA's boxes ---------- */
const ADT1_ATTACH = { intimation: 'adt1FileIntimation', consent: 'adt1FileConsent', optional: 'adt1FileOptional' };
const adt1Files = {};                       // { intimation|consent|optional: { name, size, type, b64 } }
const MAX_ATTACH_BYTES = 2 * 1024 * 1024;   // MCA: "Max 2 MB" per box
// MCA rejects some characters in file names: keep letters, digits, dot, dash and underscore.
const attachSafeName = n => {
  let s = String(n || 'file.pdf').replace(/[^A-Za-z0-9_.\-]+/g, '_').replace(/_{2,}/g, '_');
  if (!/\.pdf$/i.test(s)) s += '.pdf';
  return s.length > 60 ? s.slice(-60) : s;
};
const readAsBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result || '').split(',')[1] || '');
  r.onerror = () => rej(r.error || new Error('could not read the file'));
  r.readAsDataURL(file);
});
function showAdt1AttachNames() {
  for (const [k, id] of Object.entries(ADT1_ATTACH)) {
    const el = document.getElementById(id + 'Name');
    if (el) el.textContent = adt1Files[k] ? 'saved: ' + adt1Files[k].name + ' (' + Math.max(1, Math.round(adt1Files[k].size / 1024)) + ' KB)' : '';
  }
}
async function bindAdt1Attachments() {
  const btn = document.getElementById('adt1AttachBtn');
  if (!btn) return;
  try {
    const saved = (await chrome.storage.local.get('adt1Attachments')).adt1Attachments || {};
    for (const k of Object.keys(ADT1_ATTACH)) if (saved[k] && saved[k].b64) adt1Files[k] = saved[k];
  } catch (_) { }
  showAdt1AttachNames();
  const warn = (title, body) => { if (window.Toasts) window.Toasts.warning({ title, body }); };
  for (const [k, id] of Object.entries(ADT1_ATTACH)) {
    const inp = document.getElementById(id);
    if (!inp) continue;
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { warn('Not a PDF', f.name + ' is not a PDF: MCA takes PDFs here.'); inp.value = ''; return; }
      if (f.size > MAX_ATTACH_BYTES) { warn('File too large', f.name + ' is over 2 MB: MCA refuses it. Compress it and choose it again.'); inp.value = ''; return; }
      try {
        adt1Files[k] = { name: attachSafeName(f.name), size: f.size, type: 'application/pdf', b64: await readAsBase64(f) };
        try { await chrome.storage.local.set({ adt1Attachments: adt1Files }); } catch (_) { warn('Not saved', 'The file is kept for this session only (browser storage is full).'); }
        showAdt1AttachNames();
      } catch (err) { warn('Could not read the file', err.message); }
    });
  }
  btn.addEventListener('click', async () => {
    if (adt1Busy || adt1FlowRun) return;
    const ta = document.getElementById('adt1FormData');
    await refreshBundledClient('adt1', ta);
    let data;
    try { data = (ta.value || '').trim() ? JSON.parse(ta.value) : {}; }
    catch (err) { if (window.Toasts) window.Toasts.error({ title: 'Invalid JSON', body: err.message }); return; }
    adt1Busy = true; btn.disabled = true;
    let guarded = null;
    try {
      const tab = await getActiveMcaTab();
      if (!tab) { if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open Form ADT-1 on mca.gov.in first.' }); return; }
      guarded = tab.id;
      if (window.Adt1Flow) await window.Adt1Flow.ensureGuards(tab.id);
      await runAdt1AttachmentsStep(data, tab);
    } catch (err) {
      if (window.Toasts) window.Toasts.error({ title: 'Upload failed', body: err.message });
    } finally {
      if (guarded != null && window.Adt1Flow) { try { await window.Adt1Flow.dropGuards(guarded); } catch (_) { } }
      adt1Busy = false; btn.disabled = false;
    }
  });
}

// Attachments and Declaration step: upload the chosen PDFs, fill the declaration, stop (no Save, Next or submit).
async function runAdt1AttachmentsStep(data, tab) {
  const have = Object.keys(adt1Files).filter(k => adt1Files[k] && adt1Files[k].b64);
  if (!have.length && window.Toasts) window.Toasts.warning({ title: 'No files chosen', body: 'Choose the PDFs under "Attachments" first. Only the declaration will be filled now.' });
  if (window.Toasts) window.Toasts.info({ title: 'ADT-1 attachments', body: 'Uploading ' + have.length + ' file(s) and filling the declaration. Keep the MCA tab open.' });
  const list = document.getElementById('adt1Result'); if (list) list.innerHTML = '';
  const out = await window.Adt1Engine.attachStep(tab.id, data, adt1Files, () => { });
  renderSimpleFormResult({ fields: out.fields || [] }, 'adt1');
  if (window.Toasts) {
    if (out.ok) window.Toasts.success({ title: 'ADT-1 attachments done', body: out.message });
    else window.Toasts.error({ title: 'ADT-1 attachments: some steps failed', body: out.message });
  }
  await Storage.saveLogs({ action: 'attach', formType: 'adt1', ok: out.ok, uploaded: out.uploaded || [], failed: out.failed || [], message: out.message });
  return out;
}

// ADT-1 "Start": open MCA if needed, wait while the person signs in, open the form, run Phase 1 and
// Phase 2 (js/adt1-flow.js). Attachments and the declaration are left to the person.
let adt1FlowRun = null;
function bindAdt1Start() {
  const startBtn = document.getElementById('adt1StartBtn');
  const stopBtn = document.getElementById('adt1StopBtn');
  const fillBtn = document.getElementById('adt1FillBtn');
  const ta = document.getElementById('adt1FormData');
  if (!startBtn || !ta) return;
  stopBtn.addEventListener('click', () => {
    if (adt1FlowRun) { adt1FlowRun.cancel(); stopBtn.disabled = true; if (window.Toasts) window.Toasts.info({ title: 'Stopping', body: 'The ADT-1 run will stop at the next safe point.' }); }
  });
  startBtn.addEventListener('click', async () => {
    if (adt1Busy || adt1FlowRun) return;
    await refreshBundledClient('adt1', ta);   // never start on a stale copy of a bundled client
    let data;
    try { data = (ta.value || '').trim() ? JSON.parse(ta.value) : {}; }
    catch (err) { if (window.Toasts) window.Toasts.error({ title: 'Invalid JSON', body: err.message }); return; }
    const cin = String((data && (data.cin || data.CIN)) || '').trim().toUpperCase();
    if (!/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cin)) {
      if (window.Toasts) window.Toasts.warning({ title: 'No valid CIN', body: 'Send the ADT-1 data from the dashboard, or paste JSON with a 21-character "cin", then click Start.' });
      return;
    }
    if (!window.Adt1Flow || !window.Adt1Engine) { if (window.Toasts) window.Toasts.error({ title: 'ADT-1 engine missing', body: 'Reload the extension at chrome://extensions.' }); return; }
    adt1Busy = true;
    startBtn.disabled = true; fillBtn.disabled = true; stopBtn.disabled = false; stopBtn.classList.remove('hidden');
    const tl = window.Timeline;
    const STEP = { tab: 'open', login: 'open', open: 'open', phase1: 'company', phase2: 'appointment' };
    try {
      await chrome.storage.local.set({ mcaFormData_adt1: data, currentForm: 'adt1' });
      if (window.DataCard) window.DataCard.render('adt1');
      const list = document.getElementById('adt1Result'); if (list) list.innerHTML = '';
      if (tl) { tl.render('adt1'); tl.setDone('prepare', Object.keys(data).length + ' values read'); tl.setActive('open', 'Checking for an MCA tab'); }
      adt1FlowRun = window.Adt1Flow.start(data, ev => {
        if (!tl) return;
        const id = STEP[ev.stage] || 'open';
        if (ev.state === 'done' && (ev.stage === 'open' || ev.stage === 'phase1' || ev.stage === 'phase2')) tl.setDone(id, ev.text);
        else tl.setActive(id, ev.text);
      });
      const res = await adt1FlowRun.promise;
      const p2 = res.phase2 || null;
      if (p2) renderSimpleFormResult({ fields: p2.fields || [] }, 'adt1');
      if (res.ok) {
        const stuck = !!(p2 && p2.advanced === false);   // saved, but Next was not clicked or did not move on
        if (tl) tl.setDone('complete', stuck ? 'Next was not clicked: check the Appointment step on MCA' : 'Phases 3 and 4 are manual: continue on MCA');
        const manual = (p2 && p2.needsManual) || [], hidden = (p2 && p2.notShown) || [], auto = (p2 && p2.autoChosen) || [];
        if (auto.length && tl) tl.setDone('complete', 'Check the automatic choice(s): ' + auto.join('; '));
        if (window.Toasts) {
          if (stuck) window.Toasts.warning({ title: 'ADT-1 phase 2 saved, but Next was not clicked', body: res.message });
          else if (manual.length || hidden.length || auto.length) window.Toasts.warning({ title: 'ADT-1 phases 1 and 2 done, a few items left', body: (auto.length ? 'Chosen automatically, please check: ' + auto.join(' | ') + '. ' : '') + (manual.length ? 'Answer on MCA: ' + manual.join(' | ') + '. ' : '') + (hidden.length ? 'Not shown on MCA, so not entered: ' + hidden.join(', ') + '. ' : '') + 'Then continue with the attachments yourself.' });
          else window.Toasts.success({ title: 'ADT-1 phases 1 and 2 done', body: res.message });
        }
        // Files already chosen: carry on into the Attachments step by itself.
        if (p2 && p2.advanced === true && Object.keys(adt1Files).some(k => adt1Files[k] && adt1Files[k].b64)) {
          try {
            const tab2 = await getActiveMcaTab();
            if (tab2 && await window.Adt1Engine.detectAttachments(tab2.id, 20000)) {
              await window.Adt1Flow.ensureGuards(tab2.id);
              try { await runAdt1AttachmentsStep(data, tab2); }
              finally { try { await window.Adt1Flow.dropGuards(tab2.id); } catch (_) { } }
            }
          } catch (err) { if (window.Toasts) window.Toasts.error({ title: 'Attachments step failed', body: err.message }); }
        }
      } else {
        const id = STEP[res.stage] || 'open';
        if (tl) tl.setError(id, { title: res.message });
        if (window.Toasts) window.Toasts.error({ title: 'ADT-1 stopped at ' + ({ tab: 'opening MCA', login: 'sign-in', open: 'opening the form', phase1: 'phase 1', phase2: 'phase 2' }[res.stage] || res.stage), body: res.message });
      }
      await Storage.saveLogs({ action: 'start', formType: 'adt1', ok: res.ok, stage: res.stage, message: res.message });
    } catch (err) {
      if (window.ErrorHandler) window.ErrorHandler.handle(err, { stepId: 'open', source: 'adt1Start' });
      else if (window.Toasts) window.Toasts.error({ title: 'ADT-1 start failed', body: err.message });
    } finally {
      adt1FlowRun = null; adt1Busy = false;
      startBtn.disabled = false; fillBtn.disabled = false; stopBtn.classList.add('hidden');
    }
  });
}

// MGT-7 and ADT-1 run on the same AEM Adaptive Forms engine as AOC-4 (guideContainer-rootPanel-
// ...-guidetextbox___jqName widgets). Writing only the DOM value (what Filler.fill/_shared.js's
// nativeSet does, for the ISOLATED-world content-script engine the other simplified forms use)
// looks like it worked, but AEM repaints the widget from its own internal data model on the next
// blur/re-render — which includes the very first time a human clicks into, then out of, that field
// — wiping whatever was only set on the DOM. Fixing this needs writing through window.guideBridge's
// model too, which only exists in the page's own MAIN world, not the ISOLATED content-script world
// Filler.fill runs in. So these two forms reuse page-automation.js's pageFill (the same
// MAIN-world-injected, model-aware engine AOC-4's phase-runner.js already relies on) instead.
const AEM_FORM_FIELDS = { mgt7: () => window.MGT7_FIELDS, adt1: () => window.ADT1_FIELDS };

// Stop for a pageFill run started by runMultiFormFill. pageFill runs inside the MCA page (every
// frame, MAIN world) and can't see the side panel, so Stop sets a flag there that pageFill checks
// before each field.
const AEM_STOP_BUTTON = { mgt7: 'mgt7StopBtn' };
const AEM_RUN = { tabId: null };
async function stopAemFill() {
  if (!AEM_RUN.tabId) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: AEM_RUN.tabId, allFrames: true }, world: 'MAIN',
      func: () => { window.__germin8StopFill = true; },
    });
  } catch (_) { /* tab closed or navigated away — nothing left to stop */ }
}

function buildSimpleAemJobs(fields, data) {
  const jobs = [];
  for (const f of fields) {
    const v = data[f.dataKey];
    if (v === undefined || v === null || v === '') continue;
    // pageFill only special-cases 'radio' and 'date' kinds; select/text/textarea all take the
    // same generic (non-radio, non-date) path, which itself branches on the element's tagName.
    const kind = f.type === 'radio' ? 'radio' : f.type === 'date' ? 'date' : 'text';
    const job = { id: f.dataKey, kind, selector: f.selector, value: String(v), index: 0 };
    // A radio/select that reveals other fields needs pageFill to actually wait for the reveal
    // before moving on to the next job — without this, pageFill's own waitForVisible() returns
    // true immediately (no selector given = nothing to wait for) and the very next job(s) can run
    // before AEM has finished rendering the panel it just unlocked, leaving them empty while later
    // jobs (reached after more real time has passed) succeed. See field-map comments for which
    // fields set this and why.
    if (f.waitForSelector) job.waitForSelector = f.waitForSelector;
    if (f.onlyIfEmpty) job.onlyIfEmpty = true;
    jobs.push(job);
  }
  return jobs;
}

// Adapts pageFill's per-job {id, ok, err, note, hidden} results into the same
// {ok, summary, fields} shape Filler.fill() returns, so the rest of runMultiFormFill's display
// logic (toasts, timeline, data card) doesn't need to know which engine ran.
function summarizeAemFillResult(fields, jobs, jobResults) {
  const byId = new Map((jobResults || []).map(r => [r.id, r]));
  const jobIds = new Set(jobs.map(j => j.id));
  const out = [];
  for (const f of fields) {
    if (!jobIds.has(f.dataKey)) { out.push({ dataKey: f.dataKey, label: f.label, status: 'skipped', reason: 'no value' }); continue; }
    const r = byId.get(f.dataKey);
    if (!r) { out.push({ dataKey: f.dataKey, label: f.label, status: 'empty', reason: 'not found' }); continue; }
    if (r.hidden) { out.push({ dataKey: f.dataKey, label: f.label, status: 'skipped', reason: r.note || 'not shown on the page' }); continue; }
    if (r.ok) { out.push({ dataKey: f.dataKey, label: f.label, status: 'filled' }); continue; }
    out.push({ dataKey: f.dataKey, label: f.label, status: 'invalid', reason: r.err || 'could not fill' });
  }
  const summary = { filled: 0, skipped: 0, invalid: 0, empty: 0, needsReview: 0 };
  for (const o of out) {
    if (o.status === 'filled') summary.filled++;
    else if (o.status === 'skipped') summary.skipped++;
    else if (o.status === 'invalid') summary.invalid++;
    else if (o.status === 'empty') summary.empty++;
  }
  return { ok: summary.filled > 0 || out.length === 0, summary, fields: out };
}

// Self-contained — injected into every frame via chrome.scripting.executeScript, so it must not
// reference anything outside its own body. Returns one boolean per selector: whether that selector
// matches an element in THIS frame's document.
function scanAemSelectors(selectors) {
  return selectors.map(sel => { try { return !!document.querySelector(sel); } catch (_) { return false; } });
}

// Per-field result containers for the forms that have one (currently MGT-7 / ADT-1) — lets the
// user see exactly which fields filled, which were skipped/not-found, and why, instead of only a
// terse toast count. Useful generally, and specifically for diagnosing "it filled but a field went
// blank again later": this list reflects what pageFill/Filler reported AT FILL TIME, so if a field
// shows "filled" here but is empty on the live page after you click into it, the value was written
// to the DOM/AEM model successfully at fill time and something about the page's own later
// behavior (not this extension) cleared it afterward — worth reporting which field, specifically.
const SIMPLE_FORM_RESULT_LIST = { mgt7: 'mgt7Result', adt1: 'adt1Result' };
function renderSimpleFormResult(result, formType) {
  const id = SIMPLE_FORM_RESULT_LIST[formType];
  const ul = id && document.getElementById(id);
  if (!ul) return;
  const fields = (result && result.fields) || [];
  const order = { invalid: 0, empty: 1, missing: 1, filled: 2, found: 2, skipped: 3, 'needs-review': 1.5 };
  const rows = fields.slice().sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const TAG = { filled: ['ok', 'filled'], found: ['ok', 'found'], invalid: ['bad', 'failed'], empty: ['bad', 'not found'], missing: ['bad', 'not found'], skipped: ['', 'skipped'], 'needs-review': ['warn', 'needs review'] };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ul.innerHTML = rows.map(r => {
    const [cls, text] = TAG[r.status] || ['', r.status];
    return '<li><div class="ex-main"><span class="ex-label">' + esc(r.label || r.dataKey) + '</span>' +
      (r.reason ? '<span class="ex-sub">' + esc(r.reason) + '</span>' : '') + '</div><span class="ex-tags"><em class="' + cls + '">' + text + '</em></span></li>';
  }).join('');
}

// MGT-7 pre-filing compliance checks (js/mgt7-checks.js). The data box holds only the Section I /
// AGM formData; the deeper sections (share capital, shareholding, meetings, remuneration) live in
// the bundled client file's referenceOnly block, so merge them in when a bundled client is chosen.
async function runMgt7Checks(data) {
  if (!window.Mgt7Checks) return null;
  const input = Object.assign({}, data);
  try {
    const id = document.getElementById('clientSelect').value;
    const meta = id && bundledFor('mgt7').find(c => c.id === id);
    if (meta) {
      const j = await (await fetch(chrome.runtime.getURL(meta.file))).json();
      if (j.referenceOnly && !input.referenceOnly && !input.sections) input.referenceOnly = j.referenceOnly;
      if (j.uncertainFields && !input.uncertainFields) input.uncertainFields = j.uncertainFields;
    }
  } catch (_) { /* no bundled file: check what is in the box */ }
  const r = window.Mgt7Checks.run(input);
  const ul = document.getElementById('mgt7Result');
  if (ul) {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const row = (i, cls, tag) => '<li><div class="ex-main"><span class="ex-label">' + esc(i.title) + '</span>' +
      (i.detail ? '<span class="ex-sub">' + esc(i.detail) + '</span>' : '') + '</div><span class="ex-tags"><em class="' + cls + '">' + tag + '</em></span></li>';
    ul.innerHTML = r.errors.map(i => row(i, 'bad', 'error')).concat(r.warnings.map(i => row(i, 'warn', 'check')), r.info.map(i => row(i, '', 'info'))).join('');
  }
  return r;
}

// Re-reads the chosen bundled client from its file into the data box and storage, so a fill never
// runs on a stale copy left from an earlier selection (the data box and storage survive reloads).
async function refreshBundledClient(formType, textarea) {
  const id = document.getElementById('clientSelect').value;
  const meta = id && bundledFor(formType).find(c => c.id === id);
  if (!meta) return;
  try {
    const j = await (await fetch(chrome.runtime.getURL(meta.file))).json();
    if (!j || !j.formData) return;
    const fresh = JSON.stringify(j.formData, null, 2);
    if ((textarea.value || '').trim() === fresh.trim()) return;
    textarea.value = fresh;
    await chrome.storage.local.set({ ['mcaFormData_' + formType]: j.formData });
    if (window.DataCard) window.DataCard.render(formType);
    if (window.Toasts) window.Toasts.info({ title: 'Client data refreshed', body: 'Reloaded ' + ((j.clientInfo && j.clientInfo.name) || id) + ' from its file before filling.' });
  } catch (_) { /* file not reachable: keep what is in the box */ }
}

async function runMultiFormFill(formType, friendly, textarea) {
  if (formType === 'adt1') await refreshBundledClient(formType, textarea);
  let data;
  try {
    const raw = (textarea.value || '').trim();
    data = raw ? JSON.parse(raw) : {};
  } catch (err) {
    if (window.Toasts) window.Toasts.error({ title: 'Invalid JSON', body: err.message });
    return;
  }
  if (!data || !Object.keys(data).length) {
    if (window.Toasts) window.Toasts.warning({ title: 'No data entered', body: 'Paste form JSON before clicking Fill.' });
    return;
  }
  // AOC-4 Offline has its own filler for the offline eForm (js/offline-engine.js).
  if (formType === 'aoc4_offline') return runOfflineFill(data);
  if (formType === 'adt1') return runAdt1Fill(data);
  // MGT-7 is STP (no resubmission): refuse to fill while the pre-filing check has errors.
  if (formType === 'mgt7') {
    const chk = await runMgt7Checks(data);
    if (chk && chk.errors.length) {
      if (window.Toasts) window.Toasts.error({ title: 'Fix ' + chk.errors.length + ' issue(s) before filling', body: chk.errors.map(e => e.title).slice(0, 3).join('; ') });
      return;
    }
  }
  RUN.tabId = null;
  const tab = await getActiveMcaTab();
  if (!tab) {
    if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open the ' + friendly + ' form on mca.gov.in first.' });
    return;
  }
  try {
    await chrome.storage.local.set({ ['mcaFormData_' + formType]: data, currentForm: formType });
    if (window.DataCard) window.DataCard.render(formType);
    if (window.Timeline) {
      window.Timeline.render(formType);
      window.Timeline.setActive('prepare', 'Flattened ' + Object.keys(data).length + ' keys');
      setTimeout(() => window.Timeline.setDone('prepare', 'Flattened ' + Object.keys(data).length + ' keys'), 200);
      window.Timeline.setActive('open', 'Reaching ' + friendly + ' tab');
    }
    await ensureInjected(tab.id);
    if (window.Timeline) window.Timeline.setDone('open', 'Tab ready at ' + (tab.url || 'MCA'));
    const phases = (window.FORMS && window.FORMS[formType] && window.FORMS[formType].phases) || [];
    const workSteps = phases.filter(p => p.id !== 'prepare' && p.id !== 'open' && p.id !== 'complete');
    for (const step of workSteps) {
      if (window.Timeline) window.Timeline.setActive(step.id, 'Writing fields');
    }
    let result;
    const aemFields = AEM_FORM_FIELDS[formType] && AEM_FORM_FIELDS[formType]();
    if (aemFields) {
      const jobs = buildSimpleAemJobs(aemFields, data);
      AEM_RUN.tabId = tab.id;
      // allFrames: MGT-7's real fields live inside a nested aemform iframe, not the top frame
      // (ADT-1's are all in the top frame, but running this in every frame costs nothing — a job
      // whose selector doesn't exist in a given frame's document just reports "not found" there).
      const injections = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true }, world: 'MAIN', func: pageFill, args: [jobs],
      });
      // Merge per-frame results: keep whichever frame actually found and filled each job's element.
      const merged = new Map();
      for (const inj of injections) {
        for (const r of (inj && inj.result && inj.result.results) || []) {
          const existing = merged.get(r.id);
          if (!existing || (!existing.ok && r.ok)) merged.set(r.id, r);
        }
      }
      result = summarizeAemFillResult(aemFields, jobs, [...merged.values()]);
      result.stopped = [...merged.values()].some(r => r.stopped);
    } else {
      result = await chrome.tabs.sendMessage(tab.id, {
        action: 'fill', formType, formData: data,
      });
    }
    const summary = (result && result.summary) || { filled: 0, skipped: 0, invalid: 0, needsReview: 0 };
    renderSimpleFormResult(result, formType);
    if (window.Timeline) {
      for (const step of workSteps) window.Timeline.setDone(step.id, 'Filled');
      window.Timeline.setActive('complete', summary.filled + ' filled, ' + (summary.invalid + summary.empty) + ' missed');
      window.Timeline.setDone('complete', summary.filled + ' filled, ' + (summary.invalid + summary.empty || 0) + ' missed');
    }
    const msg = summary.filled + ' filled, ' + (summary.needsReview || 0) + ' need review, ' + (summary.invalid || 0) + ' failed';
    if (window.Toasts) {
      if (result && result.stopped) window.Toasts.warning({ title: friendly + ' fill stopped', body: msg + '. Fields after the stop were left untouched.' });
      else if (!summary.filled) window.Toasts.error({ title: 'Nothing was filled on this page', body: 'None of the ' + friendly + ' fields were found. Open the form page itself, then use Check fields.' });
      else if (result && result.ok) window.Toasts.success({ title: friendly + ' fill complete', body: msg });
      else window.Toasts.warning({ title: friendly + ' fill finished with issues', body: msg });
    }
    await Storage.saveLogs({ action: 'fill', formType, summary });
  } catch (err) {
    if (window.ErrorHandler) window.ErrorHandler.handle(err, { stepId: 'open', source: 'multiFormFill' });
    else if (window.Toasts) window.Toasts.error({ title: 'Fill failed', body: err.message });
  }
}

// ADT-1 runs one step at a time (js/adt1-engine.js). The single "Fill ADT-1" button looks at which
// step of the wizard is open on the MCA page:
//   Company Information             -> Phase 1: put in the CIN, wait for MCA's autofill, click Next.
//   Appointment and Auditor Details -> Phase 2: fill the appointment / auditor fields, click that
//                                      step's Save, stop (Next is left to the user).
// The Declaration step is not automated yet.
let adt1Busy = false;
async function runAdt1Fill(data) {
  if (adt1Busy) return;
  let guardedTab = null;
  const btn = document.getElementById('adt1FillBtn');
  adt1Busy = true; btn.disabled = true;
  try {
    RUN.tabId = null;
    const tab = await getActiveMcaTab();
    if (!tab) {
      if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open Form ADT-1 on mca.gov.in first.' });
      return;
    }
    guardedTab = tab.id;
    if (window.Adt1Flow) await window.Adt1Flow.ensureGuards(tab.id);   // MCA popups are pressed OK for you
    const where = await window.Adt1Engine.detectStep(tab.id);
    if (where.step === 'company') await runAdt1CompanyStep(data, tab);
    else if (where.step === 'appointment') await runAdt1AppointmentStep(data, tab);
    else if (await window.Adt1Engine.detectAttachments(tab.id)) await runAdt1AttachmentsStep(data, tab);
    else if (window.Toasts) {
      window.Toasts.error({
        title: 'ADT-1 form not open',
        body: where.error || 'Open Form ADT-1 on mca.gov.in at "Company Information" or "Appointment and Auditor Details" (the Declaration step is not automated yet), then click Fill ADT-1 again.'
      });
    }
  } catch (err) {
    if (window.ErrorHandler) window.ErrorHandler.handle(err, { stepId: 'open', source: 'adt1Fill' });
    else if (window.Toasts) window.Toasts.error({ title: 'Fill failed', body: err.message });
  } finally {
    if (guardedTab != null && window.Adt1Flow) { try { await window.Adt1Flow.dropGuards(guardedTab); } catch (_) { } }
    adt1Busy = false; btn.disabled = false;
  }
}

// Shared start-up for both ADT-1 phases: remember the data, show it on the data card, reset the timeline.
async function startAdt1Run(data, tab, doneNote) {
  const tl = window.Timeline;
  await chrome.storage.local.set({ mcaFormData_adt1: data, currentForm: 'adt1' });
  if (window.DataCard) window.DataCard.render('adt1');
  const list = document.getElementById('adt1Result');
  if (list) list.innerHTML = '';
  if (tl) {
    tl.render('adt1');
    tl.setDone('prepare', doneNote);
    tl.setDone('open', 'Tab ready at ' + (tab.url || 'MCA'));
  }
  return tl;
}

// Phase 1: Company Information.
async function runAdt1CompanyStep(data, tab) {
  const tl = await startAdt1Run(data, tab, 'CIN read');
  if (tl) tl.setActive('company', 'Starting');
  if (window.Toasts) window.Toasts.info({ title: 'ADT-1 phase 1: Company Information', body: 'Entering the CIN and waiting for MCA to autofill the company details.' });
  const out = await window.Adt1Engine.run(tab.id, data, text => { if (tl) tl.setActive('company', text); });
  if (out.ok) {
    if (tl) { tl.setDone('company', 'CIN filled, autofill done, Next clicked'); tl.setDone('complete', 'Click Fill ADT-1 again on the next step'); }
    if (window.Toasts) window.Toasts.success({ title: 'ADT-1 Company Information done', body: out.message + ' When "Appointment and Auditor Details" opens, click Fill ADT-1 again.' });
  } else {
    if (tl) tl.setError('company', { title: out.message });
    if (window.Toasts) window.Toasts.error({ title: out.failedStep === 'next' ? 'ADT-1: Next did not go through' : 'ADT-1: CIN autofill did not finish', body: out.message });
  }
  await Storage.saveLogs({ action: 'fill', formType: 'adt1', phase: 'company', ok: out.ok, failedStep: out.failedStep, message: out.message });
}

// Phase 2: Appointment and Auditor Details. Fills the fields, lists what is still unanswered, clicks
// that step's Save and stops.
async function runAdt1AppointmentStep(data, tab) {
  const tl = await startAdt1Run(data, tab, Object.keys(data).length + ' values read');
  if (tl) tl.setActive('appointment', 'Starting');
  if (window.Toasts) window.Toasts.info({ title: 'ADT-1 phase 2: Appointment and Auditor Details', body: 'Filling the appointment and auditor fields, then clicking Save and Next. Keep the MCA tab open.' });
  const out = await window.Adt1Engine.runAppointment(tab.id, data, text => { if (tl) tl.setActive('appointment', text); }, { goNext: true });
  renderSimpleFormResult({ fields: out.fields || [] }, 'adt1');
  const nFilled = (out.filled || []).length, nFailed = (out.failed || []).length, nManual = (out.needsManual || []).length;
  const nHidden = (out.notShown || []).length;
  const auto = out.autoChosen || [], nAuto = auto.length;
  const autoNote = nAuto ? 'Chosen automatically, please check: ' + auto.join(' | ') + '. ' : '';
  const counts = nFilled + ' filled' + (nFailed ? ', ' + nFailed + ' failed' : '') + (nManual ? ', ' + nManual + ' to answer by hand' : '') + (nHidden ? ', ' + nHidden + ' not shown on MCA' : '') + (nAuto ? ', ' + nAuto + ' chosen automatically (check)' : '');
  if (out.ok) {
    const moved = out.advanced === true;
    const nextHint = moved ? 'Next was clicked: the form is on the next step (attachments and declaration are yours).' : 'Next was not clicked: ' + (nManual ? 'answer the listed questions, then click Next yourself.' : 'check the page, then click Next yourself.');
    if (tl) { tl.setDone('appointment', counts + ', saved' + (moved ? ', Next clicked' : '')); tl.setDone('complete', moved ? 'Phases 3 and 4 are manual: continue on MCA' : (nManual ? 'Answer the listed questions on MCA, then click Next' : nAuto ? 'Check the automatic choice(s): ' + auto.join('; ') + ', then click Next' : 'Review on MCA, then click Next')); }
    if (window.Toasts) {
      if (nHidden && !nManual) window.Toasts.warning({ title: 'ADT-1 appointment saved, ' + nHidden + ' value(s) not entered', body: autoNote + 'MCA did not show a box for: ' + out.notShown.join(', ') + '. If that is unexpected, answer the question above them on MCA and run Fill ADT-1 again. ' + nextHint });
      else if (nManual) window.Toasts.warning({ title: 'ADT-1 appointment saved, ' + nManual + ' question(s) left for you', body: autoNote + 'Answer these on MCA: ' + out.needsManual.join(' | ') + '. ' + nextHint });
      else if (nAuto) window.Toasts.warning({ title: 'ADT-1 appointment saved, ' + nAuto + ' choice(s) made for you', body: autoNote + 'MCA needed it and the data did not say; correct it on the page if it is wrong. ' + nextHint });
      else if (moved) window.Toasts.success({ title: 'ADT-1 Appointment and Auditor Details saved, Next clicked', body: counts + '. The form is now on the next step: attachments and the declaration are yours.' });
      else window.Toasts.warning({ title: 'ADT-1 Appointment and Auditor Details saved', body: counts + '. ' + nextHint });
    }
  } else {
    if (tl) tl.setError('appointment', { title: out.message });
    if (window.Toasts) {
      window.Toasts.error({
        title: out.failedStep === 'save' || out.failedStep === 'next' ? 'ADT-1: Next did not go through' : out.saved ? 'ADT-1: saved, but some fields failed' : 'ADT-1: appointment details not filled',
        body: out.message
      });
    }
  }
  await Storage.saveLogs({
    action: 'fill', formType: 'adt1', phase: 'appointment', ok: out.ok, failedStep: out.failedStep, saved: !!out.saved,
    filled: nFilled, failed: nFailed, failedKeys: (out.failed || []).map(f => f.key), needsManual: out.needsManual || [], autoChosen: auto,
    mcaMessages: (out.mcaMessages || []).slice(0, 6), message: out.message
  });
}

/* ---------- Data sent from the dashboard while this panel is open ---------- */
// Key-order-independent JSON, to tell "same data" from "different data".
function stableJson(v) {
  const sorted = x => Array.isArray(x) ? x.map(sorted)
    : (x && typeof x === 'object') ? Object.keys(x).sort().reduce((o, k) => { o[k] = sorted(x[k]); return o; }, {}) : x;
  return JSON.stringify(sorted(v));
}

// The dashboard hands ADT-1 data to background.js, which writes importedClients and
// mcaFormData_adt1 in one go. The side panel stays open meanwhile, so pick the change up here:
// refresh the ADT-1 data box, the client list and the data card without a reload.
function bindDashboardSync() {
  if (!chrome.storage || !chrome.storage.onChanged) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    try { onAdt1StorageChanged(changes); } catch (e) { console.warn('Germin8: storage sync failed', e); }
  });
}

function onAdt1StorageChanged(changes) {
  const imp = changes.importedClients;
  const dat = changes.mcaFormData_adt1;
  if (!imp && !dat) return;

  // A new or re-sent ADT-1 entry in importedClients.
  let newestId = null;
  if (imp) {
    const before = imp.oldValue || {};
    importedClients = imp.newValue || {};
    let newest = -1;
    for (const id of Object.keys(importedClients)) {
      const e = importedClients[id];
      if (entryForm(e) !== 'adt1' || !e.formData) continue;
      const at = Number(e.importedAt) || 0;
      if ((!before[id] || before[id].importedAt !== e.importedAt) && at >= newest) { newest = at; newestId = id; }
    }
  }
  // The background writes both keys in one call when the dashboard sends ADT-1 data; either one alone
  // is this panel's own edit (data card editor, loading a client, import), which needs no announcement.
  const pushed = !!(imp && dat && dat.newValue && newestId);

  if (imp) {
    const sel = document.getElementById('clientSelect');
    const keep = sel ? sel.value : '';
    // Keep what the user had chosen, except that freshly pushed data becomes the shown client.
    rebuildClientSelect(pushed && activeForm === 'adt1' ? newestId : keep);
  }

  const incoming = dat && dat.newValue;
  if (incoming && typeof incoming === 'object' && Object.keys(incoming).length) {
    const box = document.getElementById(FORM_TEXTAREA.adt1);
    if (box) {
      let current = null;
      try { current = JSON.parse(box.value); } catch (_) { /* empty or invalid JSON: counts as different */ }
      // Leave the box alone when it already holds exactly this data, so text being typed is not disturbed.
      if (!current || stableJson(current) !== stableJson(incoming)) box.value = JSON.stringify(incoming, null, 2);
    }
    if (activeForm === 'adt1' && window.DataCard) window.DataCard.render('adt1');
  }
  if (pushed && window.Toasts) {
    const e = importedClients[newestId] || {};
    window.Toasts.success({ title: 'ADT-1 data received from the dashboard', body: (e.clientInfo && e.clientInfo.name) || (incoming && (incoming.companyName || incoming.cin)) || newestId });
  }
}

// AOC-4 Offline has its own filler (js/offline-engine.js): the offline eForm is a different page from
// the online AOC-4 form. It waits for MCA's CIN lookup, so a run takes a minute or so.
let offlineBusy = false;
const OFFLINE_TAG = { filled: ['ok', 'filled'], already: ['ok', 'already set'], found: ['ok', 'found'], failed: ['bad', 'failed'], disabled: ['bad', 'disabled'], missing: ['warn', 'not on page'], skipped: ['', 'skipped'], unmapped: ['warn', 'no map yet'] };
function renderOfflineResults(out, target) {
  const ul = target || document.getElementById('offResult');
  if (!ul) return;
  const order = { failed: 0, disabled: 0, missing: 1, unmapped: 2, filled: 3, already: 3, found: 3, skipped: 4 };
  const rows = out.results.slice().sort((a, b) => order[a.status] - order[b.status]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ul.innerHTML = rows.map(r => {
    const [cls, text] = OFFLINE_TAG[r.status] || ['', r.status];
    return '<li><div class="ex-main"><span class="ex-label">' + esc(r.label) + '</span>' +
      (r.reason ? '<span class="ex-sub">' + esc(r.reason) + '</span>' : '') + '</div><span class="ex-tags"><em class="' + cls + '">' + text + '</em></span></li>';
  }).join('');
}

async function runOfflineFill(data) {
  if (offlineBusy) return;
  if (window.RunStatus && window.RunStatus.isRunning()) {
    if (window.Toasts) window.Toasts.info({ title: 'A fill is already running', body: 'See the Run status card below, or press Stop first.' });
    return;
  }
  RUN.tabId = null;
  const tab = await getActiveMcaTab();
  if (!tab) {
    if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open the AOC-4 Offline form on mca.gov.in first.' });
    return;
  }
  const btn = document.getElementById('aoc4OffFillBtn');
  offlineBusy = true; btn.disabled = true;
  try {
    await chrome.storage.local.set({ mcaFormData_aoc4_offline: data, currentForm: 'aoc4_offline' });
    if (window.DataCard) window.DataCard.render('aoc4_offline');
    if (window.Toasts) window.Toasts.info({ title: 'Filling AOC-4 Offline…', body: 'Keep the MCA tab open. MCA looks up the CIN first, so this takes a minute.' });
    const out = await window.OfflineEngine.run(tab.id, data, 'fill');
    const s = out.summary;
    await Storage.saveLogs({ action: 'fill', formType: 'aoc4_offline', summary: s, fatal: out.fatal || null });
    if (window.Toasts) {
      if (out.fatal) {
        window.Toasts.error({ title: 'AOC-4 Offline fill stopped', body: out.fatal + (s.filled + s.already ? ' ' + s.filled + ' filled and ' + s.already + ' already set before it stopped.' : '') });
        return;
      }
      if (out.stopped) { window.Toasts.warning({ title: 'AOC-4 Offline fill stopped', body: s.filled + ' filled, ' + s.already + ' already set before you pressed Stop.' }); return; }
      const body = [s.filled && s.filled + ' filled', s.already && s.already + ' already set', s.failed && s.failed + ' failed', s.missing && s.missing + ' not on the page', s.unmapped && s.unmapped + ' without a field map yet'].filter(Boolean).join(', ');
      if (!s.filled && !s.already) window.Toasts.error({ title: 'Nothing was filled', body: body + '. See the list below.' });
      else if (s.failed || s.missing) window.Toasts.warning({ title: 'AOC-4 Offline filled with issues', body: body + '. Click Fill again to retry only those.' });
      else window.Toasts.success({ title: 'AOC-4 Offline filled and checked', body });
    }
  } catch (err) {
    if (window.ErrorHandler) window.ErrorHandler.handle(err, { source: 'offlineFill' });
    else if (window.Toasts) window.Toasts.error({ title: 'Fill failed', body: err.message });
  } finally {
    offlineBusy = false; btn.disabled = false;
  }
}

async function runMultiFormScan(formType, friendly) {
  if (formType === 'aoc4_offline') {
    RUN.tabId = null;
    const tab = await getActiveMcaTab();
    if (!tab) {
      if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open the AOC-4 Offline form on mca.gov.in first.' });
      return;
    }
    try {
      const out = await window.OfflineEngine.run(tab.id, {}, 'check');
      renderOfflineResults(out);
      if (window.Toasts) window.Toasts.info({ title: out.summary.found + ' / ' + out.summary.total + ' fields found on this page', body: 'Some fields only appear after the CIN is filled in.' });
    } catch (err) {
      if (window.ErrorHandler) window.ErrorHandler.handle(err, { source: 'offlineCheck' });
    }
    return;
  }
  RUN.tabId = null;
  const tab = await getActiveMcaTab();
  if (!tab) {
    if (window.Toasts) window.Toasts.error({ title: 'No MCA tab', body: 'Open the ' + friendly + ' form on mca.gov.in first.' });
    return;
  }
  try {
    let result;
    const aemFields = AEM_FORM_FIELDS[formType] && AEM_FORM_FIELDS[formType]();
    if (aemFields) {
      // Same reason as the fill path: MGT-7's real fields live inside a nested iframe, which the
      // ISOLATED content script (manifest has no "all_frames") never reaches — so run the presence
      // check across every frame instead and OR the per-frame results together.
      const selectors = aemFields.map(f => f.selector);
      const injections = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', func: scanAemSelectors, args: [selectors],
      });
      const foundAny = new Array(selectors.length).fill(false);
      for (const inj of injections) {
        const perFrame = (inj && inj.result) || [];
        perFrame.forEach((found, i) => { if (found) foundAny[i] = true; });
      }
      const fields = aemFields.map((f, i) => ({ dataKey: f.dataKey, label: f.label, status: foundAny[i] ? 'found' : 'missing' }));
      result = { totalFound: foundAny.filter(Boolean).length, totalExpected: aemFields.length, fields };
      renderSimpleFormResult({ fields }, formType);
    } else {
      await ensureInjected(tab.id);
      result = await chrome.tabs.sendMessage(tab.id, { action: 'scan', formType });
    }
    const hits = result && result.totalFound;
    const total = result && result.totalExpected;
    if (window.Toasts) window.Toasts.info({ title: friendly + ' scan', body: hits + ' / ' + total + ' fields located on this page' });
    await Storage.saveLogs({ action: 'scan', formType, hits, total });
  } catch (err) {
    if (window.ErrorHandler) window.ErrorHandler.handle(err, { source: 'multiFormScan' });
  }
}

/* ---------- Helpers ---------- */
const MSG_ICON = { success: 'i-checkcircle', error: 'i-xcircle', warning: 'i-alert', info: 'i-info' };
function showMessage(type, text, ms = 6000) {
  // Any leading emoji/symbol run is dropped once; the level already carries the meaning.
  const clean = String(text == null ? '' : text).replace(/^[\p{Extended_Pictographic}\u2300-\u23FF\u2700-\u27BF\uFE0F\s]+/u, '');
  const el = document.getElementById('message');
  if (el) {
    el.className = `msg ${type} ${MSG_ICON[type] || ''}`.trim();
    el.textContent = clean;
    el.classList.remove('hidden');
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => el.classList.add('hidden'), ms);
  }
  // The banner above only exists inside the AOC-4 workflow. When it isn't on screen (another
  // form is selected), use the header notice instead so the message is not lost.
  try {
    const bannerVisible = el && el.offsetParent !== null;
    if (window.Toasts && !bannerVisible) {
      const level = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
      window.Toasts[level]({ title: clean });
    }
  } catch (_) {}
}

function updateProgress(cur, total) {
  const pct = total ? Math.round((cur / total) * 100) : 0;
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${cur} / ${total}`;
}
function displayFieldList(data) {
  const ul = document.getElementById('fieldList');
  if (!ul) return;
  ul.innerHTML = '';
  const phase = currentPhase();
  document.getElementById('previewTitle').textContent = phase.label;
  const fields = phaseFields(phase.id);
  for (const m of fields) {
    const v = data[m.key];
    const optionalSkipped = m.optionalGroup && !hasOptionalGroupData(data, m.optionalGroup);
    const invalidIdentifier = !optionalSkipped && isZeroIdentifier(m, v);
    const has = !optionalSkipped && !invalidIdentifier && v !== undefined && v !== null && v !== '';
    const status = invalidIdentifier ? 'invalid · blocked' : has ? (m.onlyIfEmpty ? 'if empty' : 'fill') : 'skip';
    const cls = invalidIdentifier ? 'empty' : has ? (m.onlyIfEmpty ? 'skipped' : 'filled') : 'empty';
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="fname">${escape(m.label || m.key)}</span>
      <span class="fval" title="${escape(optionalSkipped || v == null ? '' : v)}">${invalidIdentifier ? '0 — blocked (invalid identifier)' : has ? escape(v) : '—'}</span>
      <span class="fstat ${cls}">${status}</span>`;
    ul.appendChild(li);
  }
}
function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ───────── Fix Panel — smart error recovery ─────────
// When MCA validation rejects a Save, the phase-runner dispatches a 'germin8:fixNeeded' event.
// This panel shows the error and input boxes for each bad field, then re-fills and retries.
const FixPanel = (() => {
  let _resolve = null;
  let _phaseId = null;
  let _tabId = null;

  function bind() {
    const closeBtn = document.getElementById('fixClose');
    const applyBtn = document.getElementById('fixApply');
    const skipBtn  = document.getElementById('fixSkip');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
    if (skipBtn)  skipBtn.addEventListener('click', skip);
    if (applyBtn) applyBtn.addEventListener('click', apply);
    window.addEventListener('germin8:fixNeeded', e => show(e.detail));
  }

  function parseErrors(validationErrors) {
    const fields = [];
    for (const raw of validationErrors) {
      const text = raw.replace(/^MCA said:\s*/i, '');
      const entry = { raw: text, label: '', hint: '', key: '' };
      // Try to extract field name from common MCA patterns:
      // "Please enter valid value for <field>" / "Please enter <field>" / "<field> is required"
      const m = text.match(/(?:enter\s+(?:valid\s+)?(?:value\s+)?(?:for\s+)?|fill\s+)["']?(.+?)["']?\s*$/i)
             || text.match(/^["']?(.+?)["']?\s+is\s+(?:required|mandatory|invalid)/i)
             || text.match(/(?:invalid|incorrect)\s+(?:value\s+)?(?:in|for)\s+["']?(.+?)["']?\s*$/i);
      if (m) {
        entry.label = m[1].replace(/[.!]+$/, '').trim();
        entry.key = entry.label.toLowerCase().replace(/\s+/g, '_');
      } else {
        entry.label = text.length > 60 ? text.slice(0, 57) + '...' : text;
        entry.key = 'field_' + fields.length;
      }
      entry.hint = text;
      fields.push(entry);
    }
    return fields;
  }

  function show({ validationErrors, phaseId, tabId }) {
    _phaseId = phaseId;
    _tabId = tabId;
    const panel   = document.getElementById('fixPanel');
    const explain = document.getElementById('fixExplain');
    const container = document.getElementById('fixFields');
    if (!panel || !container) return;

    const fields = parseErrors(validationErrors || []);
    explain.textContent = fields.length === 1
      ? 'MCA rejected one field. Enter the correct value below.'
      : `MCA rejected ${fields.length} field(s). Fix them below and click "Fix & Continue".`;

    container.innerHTML = '';
    for (const f of fields) {
      const div = document.createElement('div');
      div.className = 'fix-field';
      div.innerHTML = `
        <label>${escape(f.label)}</label>
        <input type="text" data-fix-key="${escape(f.key)}" placeholder="Enter correct value" />
        <p class="fix-hint">${escape(f.hint)}</p>`;
      container.appendChild(div);
    }
    panel.classList.remove('hidden');
    const first = container.querySelector('input');
    if (first) first.focus();

    return new Promise(resolve => { _resolve = resolve; });
  }

  function collectValues() {
    const inputs = document.querySelectorAll('#fixFields input[data-fix-key]');
    const vals = {};
    for (const inp of inputs) {
      const v = inp.value.trim();
      if (v) vals[inp.dataset.fixKey] = v;
    }
    return vals;
  }

  async function apply() {
    const vals = collectValues();
    if (!Object.keys(vals).length) {
      if (window.Toasts) window.Toasts.warning({ title: 'Enter at least one value' });
      return;
    }
    hide();
    if (_resolve) { _resolve({ action: 'fix', values: vals, phaseId: _phaseId, tabId: _tabId }); _resolve = null; }
  }

  function skip() {
    hide();
    if (_resolve) { _resolve({ action: 'skip', phaseId: _phaseId }); _resolve = null; }
  }

  function dismiss() {
    hide();
    if (_resolve) { _resolve({ action: 'dismiss', phaseId: _phaseId }); _resolve = null; }
  }

  function hide() {
    const panel = document.getElementById('fixPanel');
    if (panel) panel.classList.add('hidden');
  }

  return { bind, show, hide };
})();

// Initialize fix panel on DOM ready
document.addEventListener('DOMContentLoaded', () => FixPanel.bind());
window.FixPanel = FixPanel;
