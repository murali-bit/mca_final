const READY_SELECTORS = {
  2: 'input[aria-label*="SRN of Form ADT-1"], input[aria-label*="holding company"]',
  3: 'input[name*="tableItem1643805949299"], input[name*="Row1643805949296"], input[name*="table-HeaderRow"]',
  4: 'input[aria-label*="operating lease"], input[aria-label*="Net Worth"]',
  5: 'input[aria-label*="beginning of the year"], input[aria-label*="maintenance of cost records"]',
  6: 'input[aria-label*="Sale or supply of services"], input[aria-label*="Revenue from operations"]',
  7: 'input[aria-label*="Total number of product"], input[aria-label*="category code"], input[aria-label*="transactions entered with related party"]'
};

async function sectionPresent(tabId, phaseId, timeoutMs) {
  const phase = PHASES.find(p => p.id === phaseId);
  if (!phase) return false;
  try {
    const [ready] = await withTimeout(chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN', func: pageWaitForSectionReady,
      args: [READY_SELECTORS[phaseId] || null, phase.navigationAnchor || null, timeoutMs]
    }), timeoutMs + 3000, 'section-check-timeout');
    return !!ready?.result;
  } catch (e) {
    if (e.message === 'section-check-timeout' || isTransientInjectError(e)) return false;
    throw e;
  }
}

// "Live progress" timeline for the AOC-4 run. Steps come from FORMS.aoc4.phases in
// forms-registry.js; the 7 fill phases map onto its 4 phase steps. Every call is guarded so a
// missing/broken timeline can never stop a fill.
const TL_STEP_FOR_PHASE = pId => pId === 1 ? 'phase1' : pId === 2 ? 'phase2' : pId === 7 ? 'phase7' : 'phase3_6';
const TL_STEP_LAST_PHASE = { phase1: 1, phase2: 2, phase3_6: 6, phase7: 7 };
function tl(method, ...args) {
  try { if (window.Timeline && typeof window.Timeline[method] === 'function') return window.Timeline[method](...args); } catch (_) { }
}
const tlNote = text => tl('note', text);
function tlFail(text) {
  const step = tl('activeStep');
  if (step) tl('setError', step, { title: text });
}

async function doFill() {
  if (fillInProgress) return;
  fillInProgress = true;
  const selected = currentPhase();
  tl('render', 'aoc4');
  tl('setActive', 'prepare', 'Reading client data…');
  const btn = document.getElementById('confirmBtn');
  const fillBtn = document.getElementById('fillBtn');
  const clientSelect = document.getElementById('clientSelect');
  btn.disabled = true;
  fillBtn.disabled = true;
  clientSelect.disabled = true;
  const autoSave = document.getElementById('autoSubmit').checked;
  const issues = [];
  const unsaved = [];      // sections MCA did not confirm; their Save is clicked once more at the end
  let lastTabId = null;
  let completedAll = false;
  // MCA's own wording is kept (it names the field) and followed by what it means and what to do.
  const explainMca = texts => {
    const first = window.Aoc4Checks ? window.Aoc4Checks.explain(texts[0]) : null;
    return `MCA shows: ${texts.slice(0, 6).join('; ')}${first ? ` — ${first.meaning} ${first.fix}` : ''}`;
  };
  const describeUnsaved = save => save.validationErrors?.length ? explainMca(save.validationErrors)
    : save.blockedByOtherSections ? 'MCA has required fields in other sections; Save will be retried after all phases are filled'
      : save.timedOut ? 'MCA did not respond to the Save click'
      : save.found === 0 ? 'no Save button was found for this section'
        : save.pageReloaded ? 'MCA reloaded the page while saving'
          : save.clicked ? 'Save clicked but MCA showed no confirmation' : 'Save was not confirmed';
  try {
    if (!currentData) {
      tlFail('No client loaded');
      showMessage('error', 'Load a client first.', 20000);
      return;
    }
    // Pre-fill check: AOC-4 is taken on record without resubmission, so wrong data is stopped here
    // rather than discovered one rejected Save at a time. Errors stop the run; warnings are shown
    // and the fill continues (MCA will stop the affected Save if they are not dealt with).
    let checkNote = '';
    if (window.Aoc4Checks) {
      let chk = null;
      try { chk = window.Aoc4Checks.run(currentData); } catch (e) { await Storage.saveLogs({ action: 'aoc4Check', error: e.message }); }
      if (chk) {
        await Storage.saveLogs({ action: 'aoc4Check', errors: chk.errors, warnings: chk.warnings, deadline: chk.deadline });
        const line = i => `${i.title}${i.detail ? ` — ${i.detail}` : ''}`;
        if (chk.errors.length) {
          tlFail(`${chk.errors.length} data error(s) — fix the client data first`);
          showMessage('error', `Fill not started. Fix these in the client data: ${chk.errors.slice(0, 5).map(line).join(' · ')}${chk.errors.length > 5 ? ` · and ${chk.errors.length - 5} more (see Logs)` : ''}`, 180000);
          return;
        }
        if (chk.warnings.length) {
          checkNote = ` · ${chk.warnings.length} warning(s)`;
          if (window.Toasts) window.Toasts.warning({ title: `${chk.warnings.length} thing(s) to check before filing`, body: chk.warnings.slice(0, 4).map(i => i.title).join(' · ') + (chk.warnings.length > 4 ? ' · more in Logs' : '') });
        }
      }
    }
    tl('setDone', 'prepare', `${Object.keys(currentData).length} values ready${checkNote}`);
    tl('setActive', 'open', 'Looking for the MCA tab…');
    const mcaTab = await getActiveMcaTab();
    if (!mcaTab) {
      tlFail('No MCA tab — open the AOC-4 form on mca.gov.in');
      showMessage('error', 'Open the AOC-4 form on mca.gov.in first.', 20000);
      return;
    }
    tl('setDone', 'open', 'Tab ready');
    // Resuming from a later phase: show the earlier steps as skipped rather than leave them pending.
    for (const step of ['phase1', 'phase2', 'phase3_6']) {
      if (TL_STEP_LAST_PHASE[step] < selected.id) tl('setDone', step, `Skipped — resumed from Phase ${selected.id}`);
    }

    for (let pId = selected.id; pId <= 7; pId++) {
      const p = PHASES.find(x => x.id === pId);
      if (!p) break;
      const step = TL_STEP_FOR_PHASE(pId);

      showMessage('info', `Starting ${p.label}…`, 30000);
      tl('setActive', step, `${p.label.split(' — ')[0]}: starting…`);
      const res = await doFillPhase(pId, true);
      // doFillPhase reports "no MCA tab" / "data problem" as { ok: false } without an error text;
      // those used to fall through and the next phase then ran against an undefined tab.
      if (!res || res.error || !res.tabId) {
        const why = (res && res.error) || 'the phase could not start (see the message above)';
        tlFail(`${p.label.split(' — ')[0]} stopped`);
        showMessage('error', `${p.label} stopped: ${why}`, 30000);
        return;
      }
      lastTabId = res.tabId || lastTabId;
      // Field-level failures are reported but never block the Save: MCA's own validation decides.
      // Name the actual fields (not just a count) so the final summary is something the user
      // can act on without having to dig through chrome.storage logs.
      if (res?.failed) {
        const named = (res.failures || []).slice(0, 8).map(d => `${labelOf(d.id)}${d.err ? ` (${d.err})` : ''}`);
        issues.push(`${p.label}: ${res.failed} field(s) could not be filled — ${named.join('; ')}${res.failures?.length > 8 ? '; …' : ''}`);
      }
      if (res?.reset?.length) {
        const named = res.reset.slice(0, 8).map(x => `${labelOf(x.id)} (now "${x.now}")`);
        issues.push(`${p.label}: MCA reset ${res.reset.length} field(s) — ${named.join('; ')}${res.reset.length > 8 ? '; …' : ''}`);
      }
      if (!autoSave) {
        tl('setDone', step, `Filled — auto-Save is off; Save on MCA, then pick the next phase`);
        return;
      }

      const save = res?.save || {};
      const phaseNote = `${p.label.split(' — ')[0]}: ${save.clicked && save.successModalClosed ? 'saved' : save.clicked ? 'Save clicked' : 'not saved yet'}${res.failed ? ` · ${res.failed} field(s) failed` : ''}`;
      if (save.manual) {
        tl('setError', step, { title: 'Paused — fill Q12(c) by hand, then Save on MCA' });
        document.getElementById('phaseSelect').value = String(pId);
        showMessage('warning', `${p.label}: Q12(c) must be completed by hand${save.armed ? '; MCA Save clicks automatically once it is filled' : ', then click Save on the MCA page'}. Afterwards select Phase 3 and click Fill Form to continue.`, 60000);
        return;
      }
      const confirmed = !!save.clicked && !!save.successModalClosed;
      if (confirmed) {
        // A confirmed Save also covers earlier phases that share the same button (Part A).
        for (let i = unsaved.length - 1; i >= 0; i--) if (unsaved[i].phase.saveIndex === p.saveIndex) unsaved.splice(i, 1);
      } else if (!save.clicked) {
        const reason = describeUnsaved(save);
        // Validation errors mean MCA rejected the data in this section — it will NOT unlock
        // the next section until these are fixed. Stop here so the user can correct them.
        if (save.validationErrors?.length) {
          tl('setError', step, { title: `${p.label.split(' — ')[0]}: fix validation errors, then Save` });
          document.getElementById('phaseSelect').value = String(pId);
          const nextPId = pId + 1;
          const resumeHint = nextPId <= 7 ? ` After saving, select Phase ${nextPId} and click Fill Form to continue.` : '';
          showMessage('warning', `${p.label} has validation errors — ${reason}. Fix the highlighted fields on the MCA page and click Save.${resumeHint}`, 60000);
          await Storage.saveLogs({ action: 'fill', phase: pId, error: 'validation errors stopped fill', details: save.validationErrors, unsaved: unsaved.map(u => `${u.phase.id}: ${u.reason}`) });
          return;
        }
        // Other save failures (blocked by other sections, timeout, etc.) — keep filling the rest
        // of the form and retry at the end, so one bad field never leaves remaining sections empty.
        unsaved.push({ phase: p, reason });
        showMessage('warning', `${p.label} was not saved (${reason}). Continuing with the next section; its Save is retried at the end.`, 30000);
      } else {
        issues.push(`${p.label}: Save clicked ${save.attempts || 1}× but MCA showed no confirmation — verify it saved`);
      }
      if (TL_STEP_LAST_PHASE[step] === pId && pId !== 7) tl('setDone', step, phaseNote);
      else tlNote(phaseNote);

      const nextPhaseId = pId + 1;
      if (nextPhaseId > 7) { completedAll = true; break; }
      const nextP = PHASES.find(x => x.id === nextPhaseId);
      showMessage('info', `${confirmed ? `${p.label} saved.` : `${p.label} done.`} Waiting for ${nextP.label}…`, 30000);
      // MCA re-renders after a Save; let it finish (and close any popup) before probing the next section.
      await waitForMcaIdle(res.tabId, `opening ${nextP.label}`);
      let nextSectionReady = await sectionPresent(res.tabId, nextPhaseId, 15000);
      if (!nextSectionReady && nextP.navigationAnchor) {
        const [navigation] = await withTimeout(chrome.scripting.executeScript({
          target: { tabId: res.tabId }, world: 'MAIN', func: pageActivateSection, args: [nextP.navigationAnchor]
        }), 10000, `Could not open ${nextP.label}.`);
        if (navigation?.result?.clicked) nextSectionReady = await sectionPresent(res.tabId, nextPhaseId, 15000);
      }
      if (!nextSectionReady) {
        tl('setActive', TL_STEP_FOR_PHASE(nextPhaseId), `Waiting for ${nextP.label.split(' — ')[0]}`);
        document.getElementById('phaseSelect').value = String(nextPhaseId);
        // Check if the section is locked because an earlier phase had unsaved errors
        const errorPhases = unsaved.filter(u => u.reason && u.reason.includes('MCA shows:'));
        if (errorPhases.length) {
          const names = errorPhases.map(u => u.phase.label.split(' — ')[0]).join(', ');
          tlFail(`${names} has errors — fix them first, then ${nextP.label.split(' — ')[0]} will unlock`);
          showMessage('warning', `MCA locked ${nextP.label} because ${names} has validation errors. Go back to ${names} on MCA, fix the errors, and click Save. Then select Phase ${nextPhaseId} and click Fill Form to continue.`, 60000);
        } else {
          tlFail(`MCA did not open ${nextP.label.split(' — ')[0]} — open it on MCA, then Fill again`);
          const pending = unsaved.length ? ` Not saved yet: ${unsaved.map(u => `${u.phase.label} (${u.reason})`).join(' · ')}.` : '';
          showMessage('warning', `MCA did not expose ${nextP.label} after ${p.label}. Open that section on MCA, then click Fill Form to resume from ${nextP.label}.${pending}`, 60000);
        }
        await Storage.saveLogs({ action: 'fill', phase: nextPhaseId, error: `section not exposed after phase ${pId}`, unsaved: unsaved.map(u => `${u.phase.id}: ${u.reason}`) });
        return;
      }
    }
    if (!completedAll) return;

    // Final sweep: a section MCA refused earlier may validate now that the rest of the form is in.
    for (const u of [...unsaved]) {
      showMessage('info', `Final sweep: clicking Save for ${u.phase.label} again…`, 30000);
      tlNote(`Final sweep: re-saving ${u.phase.label.split(' — ')[0]}…`);
      const save = await saveSection(lastTabId, u.phase);
      if (save.clicked && save.successModalClosed) { unsaved.splice(unsaved.indexOf(u), 1); continue; }
      if (save.clicked) { unsaved.splice(unsaved.indexOf(u), 1); issues.push(`${u.phase.label}: ${describeUnsaved(save)} — verify it saved`); continue; }
      u.reason = describeUnsaved(save);
    }
    const notSaved = unsaved.map(u => `${u.phase.label} — ${u.reason}`);
    const summary = notSaved.length
      ? `All 7 phases filled, but MCA did not save: ${notSaved.join(' · ')}. Correct those fields on the MCA page and click that section's Save.${issues.length ? ` Also review: ${issues.join(' · ')}` : ''}`
      : issues.length
        ? `All 7 phases saved, but review these on the MCA page: ${issues.join(' · ')}`
        : 'All 7 phases filled and saved. Review the form on MCA, then attach documents and submit.';
    showMessage(notSaved.length || issues.length ? 'warning' : 'success', summary, 180000);
    if (notSaved.length) tl('setError', 'phase7', { title: `Not saved: ${unsaved.map(u => u.phase.label.split(' — ')[0]).join(', ')}` });
    else tl('setDone', 'phase7', issues.length ? `All phases saved · ${issues.length} item(s) to review` : 'All 7 phases filled and saved');
    await Storage.saveLogs({ action: 'fillComplete', issues, notSaved });
  } catch (e) {
    const message = describeInjectError(e);
    tlFail(message.length > 90 ? message.slice(0, 87) + '…' : message);
    showMessage('error', `${message}`, 30000);
    await Storage.saveLogs({ action: 'fill', error: message, raw: e.message, unsaved: unsaved.map(u => `${u.phase.id}: ${u.reason}`) });
  } finally {
    fillInProgress = false;
    // Give the page back its native dialogs once the run is over.
    try {
      const tab = await getActiveMcaTab();
      if (tab) await withTimeout(chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: pageUninstallDialogGuard }), 5000, 'guard-timeout');
    } catch (_) { /* page gone or busy; the guard is harmless until reload */ }
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Confirm & Fill';
      fillBtn.disabled = !currentData;
      clientSelect.disabled = false;
    }, 1200);
  }
}

// Clicks one section's Save again (final sweep) and returns the pageSave-style result.
async function saveSection(tabId, phase) {
  let jobs = [];
  try { jobs = buildJobs(currentData, phase.id); } catch (_) { }
  await installDialogGuard(tabId);
  const { save } = await runSaveLoop(tabId, phase, jobs, () => { });
  await Storage.saveLogs({ action: 'resave', phase: phase.id, save });
  return save;
}

// Mirrors the per-phase table inside pageSave (which must stay self-contained for injection).
const PHASE_MARKERS = {
  1: '\\b(cin|financial year|date of incorporation|registered office|agm|annual general meeting|signing of reports)\\b',
  2: '\\b(subsidiary|adt.?1|number of auditors|income.?tax pan|auditor.?s firm|membership number|name of the auditor|address line 1|pin code|state\\/ut|schedule\\s*iii|consolidated financial statements|books of account|computer servers|service provider)\\b',
  3: '\\b(break.?up of figures|trade receivables|long.?term borrowings|short.?term borrowings|total assets)\\b',
  4: '\\b(operating lease|net worth|unpaid dividend|iepf|share application money|shares bought back|unclaimed matured debentures|commercial paper|foreign exchange exposure)\\b',
  5: '\\b(share capital|cost records|cost audit)\\b',
  6: '\\b(profit.?and.?loss|revenue from operations|earnings per share|profit before|foreign exchange|income in foreign currency|expenditure in foreign currency)\\b',
  7: '\\b(transactions entered with related party|auditor.?s report|csr applicability|secretarial audit|product or service|product category|turnover of the product)\\b'
};

// Save, confirm, re-click loop. A Save counts as confirmed only when MCA shows its success
// dialog (which is closed). One re-click at most: a silent save must not be re-posted again and again.
async function runSaveLoop(tabId, phase, jobs, setStatus) {
  const { phaseValidationLabels, partnerLabels, saveArgs } = buildSaveArgs(phase);
  // Part A's single Save validates Q1–12, so errors from either half count after a Phase 1 or 2 Save.
  const partA = phase.id === 1 || phase.id === 2;
  const confirmMarker = partA ? `(?:${PHASE_MARKERS[1]})|(?:${PHASE_MARKERS[2]})` : PHASE_MARKERS[phase.id] || null;
  const confirmLabels = partA ? [...phaseValidationLabels, ...partnerLabels] : phaseValidationLabels;
  const clickSave = async () => {
    try {
      const [s] = await withTimeout(chrome.scripting.executeScript({
        target: { tabId }, world: 'MAIN', func: pageSave, args: saveArgs
      }), 60000, 'save-timeout');
      return s?.result || { clicked: false, dialogs: [] };
    } catch (e) {
      if (e.message === 'save-timeout') return { clicked: false, timedOut: true, dialogs: [] };
      if (isTransientInjectError(e)) return { clicked: false, pageReloaded: true, dialogs: [] };
      throw e;
    }
  };
  const MAX_SAVE_ATTEMPTS = 2;
  const dialogs = [];
  let save = { clicked: false, dialogs: [] };
  for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
    // Match the working main flow: try the visible Save immediately after filling.
    // The page-wide idle monitor can wait indefinitely on MCA's long-lived AJAX activity.
    setStatus(attempt === 1 ? 'Saving…' : `Save ${attempt}/${MAX_SAVE_ATTEMPTS}…`,
      attempt > 1 ? `MCA did not confirm the save — clicking Save again (${attempt}/${MAX_SAVE_ATTEMPTS})…` : null);
    save = await clickSave();
    save.attempts = attempt;
    dialogs.push(...(save.dialogs || []));
    // AEM validates the whole form on Save. If other sections are still incomplete,
    // retrying this same Save cannot work; continue filling and retry in the final sweep.
    if (save.blockedByOtherSections) break;
    if (save.validationErrors?.length) break;           // MCA rejected the data: re-clicking cannot help
    if (save.clicked && save.successModalClosed) break; // confirmed
    if (save.found === 0 && !save.pageReloaded) break;  // nothing to click
    // Clicked but not confirmed yet: give MCA more time, closing any popup that appears.
    const [c] = await withTimeout(chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN', func: pageConfirmSave, args: [12000, confirmMarker, confirmLabels]
    }), 50000, 'confirm-timeout').catch(() => [{ result: null }]);
    const confirm = c?.result;
    if (confirm?.dialogs?.length) dialogs.push(...confirm.dialogs);
    if (confirm?.confirmed) { save.clicked = true; save.successModalClosed = true; save.confirmedLate = true; break; }
    if (confirm?.errorsVisible) { save.clicked = false; save.validationErrors = confirm.errorTexts || ['MCA shows field errors after Save']; break; }
    if (attempt === MAX_SAVE_ATTEMPTS && save.clicked) save.unconfirmed = true;
  }
  save.dialogs = dialogs;
  return { save, dialogs };
}

// Balance-sheet rows have no label in the map: derive one from the data key ("SHARE_CAPITAL_CUR" becomes "Share capital (current)").
const labelOf = id => {
  const f = FIELD_MAPPINGS.find(x => x.id === id) || {};
  if (f.label) return f.label;
  const key = f.key || id;
  return key.replace(/_(CUR|PREV)$/, (_, p) => p === 'CUR' ? ' (current)' : ' (previous)')
    .replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
};

async function doFillPhase(phaseId, deferReset = false) {
  const btn = document.getElementById('confirmBtn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Injecting…';
  showMessage('info', 'Preparing MCA tab…');

  const tab = await getActiveMcaTab();
  if (!tab) {
    btn.disabled = false; btn.textContent = origText;
    showMessage('error', 'Open the AOC-4 form on mca.gov.in first.');
    return { ok: false };
  }

  const phase = PHASES.find(p => p.id === phaseId) || currentPhase();
  let jobs;
  try { jobs = buildJobs(currentData, phase.id); }
  catch (e) {
    btn.disabled = false; btn.textContent = origText;
    showMessage('error', `Data problem: ${e.message}`, 20000);
    return { ok: false };
  }
  const fieldCount = phaseFields(phase.id).length;
  const skipped = fieldCount - jobs.filter(j => j.kind !== 'waitFor').length;
  const r = { filled: 0, skipped, hidden: 0, failed: 0, details: [], dialogs: [], save: null };
  document.getElementById('progressWrap').classList.remove('hidden');
  updateProgress(0, jobs.length);

  try {
    // Native alert/confirm boxes freeze the page thread; auto-accept them for the whole run.
    await installDialogGuard(tab.id);
    const startIdle = await waitForMcaIdle(tab.id, `starting ${phase.label}`);
    r.dialogs.push(...startIdle.dialogs);

    // Runs one field on the page. Handles a frozen page (timeout: wait for it to come back)
    // and transient injection errors (MCA re-rendering/reloading: wait until idle, retry once).
    async function runPageJob(job, label, limit) {
      const jobsArray = Array.isArray(job) ? job : [job];
      const inject = () => withTimeout(chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN', func: pageFill, args: [jobsArray]
      }), limit, 'timeout');
      try {
        return await inject();
      } catch (e) {
        if (e.message === 'timeout') {
          showMessage('info', `"${label}" is slow — waiting for MCA to recover…`, 30000);
          let recovered = false;
          for (let wait = 0; wait < 5 && !recovered; wait++) {
            await sleep(3000);
            recovered = await pageAlive(tab.id);
          }
          if (!recovered) { await sleep(10000); recovered = await pageAlive(tab.id); }
          if (!recovered) throw new Error(`MCA page froze after setting "${label}". Close any dialog on the MCA tab (reload it if needed), then click Fill Form to resume from this phase.`);
          const idle = await waitForMcaIdle(tab.id, `retrying ${label}`);
          r.dialogs.push(...idle.dialogs);
          try { return await inject(); }
          catch (_) { return { timedOutTwice: true }; }
        }
        if (isTransientInjectError(e)) {
          showMessage('info', `MCA page is reloading — waiting before "${label}"…`, 30000);
          await sleep(2500);
          const idle = await waitForMcaIdle(tab.id, `retrying ${label}`);
          r.dialogs.push(...idle.dialogs);
          await installDialogGuard(tab.id);
          return await inject();
        }
        throw e;
      }
    }

    // Jobs that don't trigger AJAX or need interactive DOM events can be sent
    // together in a single pageFill call, avoiding per-field idle checks and
    // injection overhead — a significant speedup for the many numeric fields
    // in the balance-sheet and P&L sections.
    const batchable = j => !(j.kind === 'waitFor' || j.kind === 'addRows' || j.kind === 'radio'
      || j.kind === 'pinCode' || j.kind === 'select' || j.kind === 'date' || j.typeChars
      || j.selectSuggestion || j.commitEnter || j.nameSelector || j.waitForSelector);
    // 40 per injection: each batch costs an idle check plus a script injection, and the page-side
    // label lookup is remembered within one batch, so larger batches are faster on both counts.
    const BATCH_MAX = 40;
    let fieldIdx = 0;
    let lastSessionCheckIdx = -20;
    while (fieldIdx < jobs.length) {
      // Session check at the start of a phase and every 60 fields after (it reads the whole page's
      // text, which is slow on this form; an expired session also surfaces as a failed Save).
      if (fieldIdx - lastSessionCheckIdx >= 60 || lastSessionCheckIdx < 0) {
        const session = await getMcaSessionStatus(tab.id);
        if (session.expired) {
          throw new Error(`MCA login/session expired before ${labelOf(jobs[fieldIdx].id)}. Sign in again on the MCA tab, reopen the AOC-4 form, and restart the fill.`);
        }
        lastSessionCheckIdx = fieldIdx;
      }
      // Collect a run of consecutive batchable jobs, or a single interactive job.
      const batchStart = fieldIdx;
      const batch = [];
      if (batchable(jobs[fieldIdx])) {
        while (fieldIdx < jobs.length && batchable(jobs[fieldIdx]) && batch.length < BATCH_MAX) {
          batch.push(jobs[fieldIdx++]);
        }
      } else {
        batch.push(jobs[fieldIdx++]);
      }
      const isBatch = batch.length > 1;
      const firstLabel = labelOf(batch[0].id);
      tlNote(`${phase.label.split(' — ')[0]}: filling ${Math.min(batchStart + batch.length, jobs.length)}/${jobs.length}`);
      if (isBatch) {
        btn.textContent = `Filling ${batchStart + 1}–${batchStart + batch.length}/${jobs.length}…`;
        showMessage('info', `${batchStart + 1}–${batchStart + batch.length}/${jobs.length}: ${firstLabel} +${batch.length - 1} fields`, 60000);
      } else {
        btn.textContent = `Filling ${batchStart + 1}/${jobs.length}…`;
        showMessage('info', `${batchStart + 1}/${jobs.length}: ${firstLabel}`, 60000);
      }
      // One idle check per batch (or per interactive field).
      const idle = await waitForMcaIdle(tab.id, firstLabel);
      r.dialogs.push(...idle.dialogs);
      if (isBatch) {
        const limit = 10000 + batch.length * 2000;
        const inj = await runPageJob(batch, `batch: ${firstLabel} +${batch.length - 1}`, limit);
        if (inj?.timedOutTwice) {
          for (let bi = 0; bi < batch.length; bi++) {
            r.details.push({ id: batch[bi].id, ok: false, err: 'batch timed out' });
            r.failed++;
            updateProgress(batchStart + bi + 1, jobs.length);
          }
          continue;
        }
        const out = inj?.[0]?.result || { results: batch.map(j => ({ id: j.id, ok: false, err: 'no result from page' })), dialogs: [] };
        r.dialogs.push(...(out.dialogs || []));
        for (let bi = 0; bi < batch.length; bi++) {
          const d = out.results[bi] || { id: batch[bi].id, ok: false, err: 'missing result' };
          r.details.push(d);
          updateProgress(batchStart + bi + 1, jobs.length);
          if (d.hidden) r.hidden++;
          else d.ok ? r.filled++ : r.failed++;
        }
      } else {
        // Single interactive field — original per-field logic.
        const job = batch[0];
        const label = firstLabel;
        // Never type into a page that is still loading, busy with an MCA request, or covered by a popup.
        // (idle check was already done above for the batch/single.)
        // Typed lookups (CIN, DIN, SRN) wait for MCA's own AJAX responses and can take well over 10s.
        const limit = job.kind === 'waitFor' ? job.timeout + 20000
          : job.kind === 'radio' || job.kind === 'pinCode' || job.typeChars ? 25000 : 10000;
        const inj = await runPageJob(job, label, limit);
        if (inj?.timedOutTwice) {
          r.details.push({ id: job.id, ok: false, err: `"${label}" timed out twice` });
          r.failed++;
          updateProgress(batchStart + 1, jobs.length);
          continue;
        }
        const out = inj?.[0]?.result || { results: [{ id: job.id, ok: false, err: 'no result from page' }], dialogs: [] };
        const d = out.results[0];
        r.details.push(d);
        r.dialogs.push(...out.dialogs);
        updateProgress(batchStart + 1, jobs.length);
        if (d.wait) {
          if (!d.ok) {
            if (job.noCin) throw new Error('No CIN in the client file. Add "CIN" under "general" in the client JSON, reload the extension, then click Fill again.');
            d.err = job.id === 'ADT_WAIT' ? `MCA did not load auditor details for ADT-1 SRN ${currentData.ADT_SRN || '(missing)'} within ${job.timeout / 1000}s — check the SRN on the MCA page`
              : job.id === 'CIN_WAIT' ? `MCA did not load company details for CIN ${currentData.CIN} within ${job.timeout / 1000}s — confirm the CIN suggestion on the MCA page`
                : `MCA lookup did not complete for ${label} within ${job.timeout / 1000}s`;
            r.failed++;
            showMessage('warning', `${d.err}. Continuing with the remaining fields.`, 15000);
          }
          continue;
        }
        if (d.hidden) r.hidden++;
        else d.ok ? r.filled++ : r.failed++;
      }
    }

    // Attempt 2 (Retry pass): re-check hidden or failed fields if any.
    const skipKinds = new Set(['addRows', 'waitFor']);
    // Fields MCA locked with a value are MCA's own lookups (company, auditor): never retype them.
    const lockedWithValue = d => d.hidden && /locked by MCA/.test(d.note || '') && /\(has "/.test(d.note || '');
    // MCA-owned fields (signatory designations) are retried too: the fill keeps whatever MCA chose,
    // so a retry can only help one that came back empty.
    const retryIdxs = r.details.map((d, i) => (d.hidden || !d.ok) && !lockedWithValue(d) && !skipKinds.has(jobs[i].kind) ? i : -1).filter(i => i >= 0);
    if (retryIdxs.length) {
      btn.textContent = 'Retry 2…';
      showMessage('info', `Attempt 2: Resolving ${retryIdxs.length} fields…`, 30000);
      await new Promise(res => setTimeout(res, 500));
      // Batch batchable retry jobs; run interactive ones individually.
      const retryBatchIdxs = retryIdxs.filter(idx => batchable(jobs[idx]));
      const retryInteractiveIdxs = retryIdxs.filter(idx => !batchable(jobs[idx]));
      const applyRetryResult = (idx, d2) => {
        const oldD = r.details[idx];
        if (d2.ok && !d2.hidden) {
          if (oldD.hidden) r.hidden--;
          else if (!oldD.ok) r.failed--;
          r.filled++;
          r.details[idx] = d2;
        } else if (!d2.hidden && oldD.hidden) {
          r.hidden--;
          r.failed++;
          r.details[idx] = d2;
        }
      };
      if (retryBatchIdxs.length) {
        const retryJobs = retryBatchIdxs.map(idx => ({ ...jobs[idx], onlyIfEmpty: false, forceFill: true }));
        try {
          const inj = await withTimeout(chrome.scripting.executeScript({
            target: { tabId: tab.id }, world: 'MAIN', func: pageFill, args: [retryJobs]
          }), 10000 + retryJobs.length * 1500, 'timeout');
          const out = inj?.[0]?.result || { results: retryJobs.map(j => ({ id: j.id, ok: false, err: 'no result' })), dialogs: [] };
          r.dialogs.push(...(out.dialogs || []));
          for (let ri = 0; ri < retryBatchIdxs.length; ri++) {
            applyRetryResult(retryBatchIdxs[ri], out.results[ri] || { id: retryJobs[ri].id, ok: false, err: 'missing result' });
          }
        } catch (_) { /* keep original results */ }
      }
      for (const idx of retryInteractiveIdxs) {
        const job = { ...jobs[idx], onlyIfEmpty: false, forceFill: true };
        try {
          const inj = await withTimeout(chrome.scripting.executeScript({
            target: { tabId: tab.id }, world: 'MAIN', func: pageFill, args: [[job]]
          }), 10000, 'timeout');
          const out = inj?.[0]?.result || { results: [{ id: job.id, ok: false, err: 'no result' }], dialogs: [] };
          r.dialogs.push(...(out.dialogs || []));
          applyRetryResult(idx, out.results[0]);
        } catch (_) { /* keep original result */ }
      }
    }

    // Post-fill: sweep all visible AEM error widgets. For fields that hold a correct
    // value, re-sync the model and call validate() to clear stale errors left by
    // race conditions between our setModel and MCA's own AJAX handlers.
    btn.textContent = 'Validating…';
    showMessage('info', 'Clearing stale validation errors…', 30000);
    try {
      await withTimeout(chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN', func: pageValidationCleanup,
        args: [[...new Set(jobs.filter(j => j.mcaOwned && j.selector).map(j => j.selector))]]
      }), 12000, 'Validation cleanup timed out');
    } catch (_) { /* non-fatal */ }

    // Final Check: verify all intended fields are intact and correctly filled on the form.
    const nonHidden = new Set(r.details.filter(d => !d.hidden && !d.wait).map(d => d.id));
    // MCA-owned fields (signatory designations) are MCA's to change; they are never "fixed" back.
    // MCA-owned fields are checked as well — not against the client file, but to catch one left
    // blank. Leaving them out is what let an empty designation through without a word.
    const toCheck = jobs.filter(j => j.value && nonHidden.has(j.id) && j.kind !== 'waitFor' && j.kind !== 'addRows');
    r.reset = [];
    if (toCheck.length) {
      btn.textContent = 'Checking…';
      showMessage('info', 'Final check: verifying form values…', 30000);
      // Phase 5 can contain dozens of repeated financial rows. Its semantic verification scans
      // the large MCA form, so scale the allowance with the number of fields instead of stopping
      // the whole run at the old 15-second limit.
      const verifyTimeoutMs = Math.min(60000, Math.max(15000, toCheck.length * 750));
      try {
        const [v] = await withTimeout(chrome.scripting.executeScript({
          target: { tabId: tab.id }, world: 'MAIN', func: pageVerify, args: [toCheck]
        }), verifyTimeoutMs, 'verify-timeout');
        r.reset = v?.result || [];
      } catch (e) {
        if (e.message !== 'verify-timeout') throw e;
        // Verification is a safeguard, not a prerequisite for Save. MCA validates its own model
        // when Save is clicked, so a slow scan should not strand a fully filled phase.
        r.reset = [];
        r.verifyTimedOut = true;
        showMessage('warning', `Final verification of ${toCheck.length} fields took too long. Continuing to Save; MCA will validate the form.`, 30000);
      }

      // Auto-fix any fields that MCA reset
      if (r.reset.length) {
        btn.textContent = 'Fixing…';
        showMessage('info', `Final check: fixing ${r.reset.length} field(s) reset by MCA…`, 30000);
        const resetIds = new Set(r.reset.map(x => x.id));
        const jobsToFix = jobs.filter(j => resetIds.has(j.id)).map(j => ({ ...j, onlyIfEmpty: false, forceFill: true }));
        // Batch batchable fix jobs; run interactive ones individually.
        const fixBatch = jobsToFix.filter(batchable);
        const fixInteractive = jobsToFix.filter(j => !batchable(j));
        if (fixBatch.length) {
          try {
            await withTimeout(chrome.scripting.executeScript({
              target: { tabId: tab.id }, world: 'MAIN', func: pageFill, args: [fixBatch]
            }), 10000 + fixBatch.length * 1500, 'timeout');
          } catch (_) { }
        }
        for (const fJob of fixInteractive) {
          try {
            await withTimeout(chrome.scripting.executeScript({
              target: { tabId: tab.id }, world: 'MAIN', func: pageFill, args: [[fJob]]
            }), 10000, 'timeout');
          } catch (_) { }
        }
        // Re-verify the fixed fields
        const fixVerifyTimeoutMs = Math.min(30000, Math.max(10000, jobsToFix.length * 750));
        try {
          const [v2] = await withTimeout(chrome.scripting.executeScript({
            target: { tabId: tab.id }, world: 'MAIN', func: pageVerify, args: [jobsToFix, 600]
          }), fixVerifyTimeoutMs, 'verify-fix-timeout');
          r.reset = v2?.result || [];
        } catch (e) {
          if (e.message !== 'verify-fix-timeout') throw e;
          r.reset = [];
          r.verifyTimedOut = true;
          showMessage('warning', `Final verification of repaired fields took too long. Continuing to Save; MCA will validate the form.`, 30000);
        }
      }

      if (r.reset.length) {
        r.filled -= r.reset.length;
        r.failed += r.reset.length;
      }
    }
    const resetNote = r.reset.length
      ? ` · MCA reset ${r.reset.length}: ${r.reset.map(x => `${labelOf(x.id)} (now "${x.now}")`).join('; ')}`
      : '';

    let saveNote = r.verifyTimedOut
      ? ' · Final verification was slow; Save was still attempted and MCA will validate the form' : '';
    if (phase.id === 2 && !hasOptionalGroupData(currentData, 'serviceProvider')) {
      saveNote += ' · Q12(c) skipped because service-provider details are unavailable';
    }
    const autoSubmit = document.getElementById('autoSubmit').checked;
    if (r.failed && autoSubmit) {
      saveNote += ` · ${r.failed} field(s) could not be filled — Save is still attempted; MCA's validation decides`;
    }
    if (phase.id === 2 && hasOptionalGroupData(currentData, 'serviceProvider')
      && FIELD_MAPPINGS.some(f => f.phase === 2 && f.manualAfterFill)) {
      if (autoSubmit) {
        const [armed] = await chrome.scripting.executeScript({
          target: { tabId: tab.id }, world: 'MAIN', func: pageArmManualSave, args: [phase.saveIndex, phase.saveAnchor || null]
        });
        saveNote += armed?.result?.armed
          ? ' · Q12(c) is manual. MCA Save will click automatically after its editable details are filled and a cloud Yes/No is selected.'
          : ' · Q12(c) is manual. Fill it, then click Save on the MCA page.';
        r.save = { clicked: false, manual: true, armed: !!armed?.result?.armed };
      } else {
        saveNote += ' · Q12(c) is manual. Fill it, then click Save on the MCA page.';
      }
    } else if (autoSubmit) {
      const session = await getMcaSessionStatus(tab.id);
      if (session.expired) throw new Error('MCA login/session expired before Save. Sign in again on the MCA tab, reopen the AOC-4 form, and restart the fill.');
      btn.textContent = 'Saving…';
      tlNote(`${phase.label.split(' — ')[0]}: saving…`);
      const loop = await runSaveLoop(tab.id, phase, jobs, (status, note) => {
        btn.textContent = status;
        if (note) showMessage('info', note, 30000);
      });
      r.save = loop.save;
      const saveDialogs = loop.dialogs;
      saveNote += r.save.validationErrors?.length
        ? ` · Save blocked by MCA validation: ${r.save.validationErrors.join('; ')}`
        : r.save.clicked
          ? ` · Save ${r.save.successModalClosed ? 'confirmed by MCA' : 'clicked (no confirmation dialog seen)'}${r.save.attempts > 1 ? ` after ${r.save.attempts} attempts` : ''}${saveDialogs.length ? ` — MCA said: "${saveDialogs.map(d => d.msg).join(' | ')}"` : ''}${r.save.jsErrors?.length ? ` — the MCA page threw a script error on Save: ${[...new Set(r.save.jsErrors)].join(' | ')}` : ''}${r.save.modelErrorsOther ? ` — MCA's form model still reports ${r.save.modelErrorsOther} invalid field(s) in other sections` : ''}`
          : r.save.blockedByOtherSections
            ? ' · MCA validation found required fields in other sections; continuing and retrying Save after all phases are filled'
          : r.save.timedOut
            ? ' · Save clicked but MCA did not respond in time — check the MCA tab'
            : r.save.pageReloaded
              ? ' · MCA reloaded the page while saving — check whether this section was saved'
              : ' · Save button not found — click Save on the MCA page yourself';
    }
    r.dialogs.push(...await readGuardDialogs(tab.id));
    const pageErrors = [...new Set(r.dialogs.filter(d => d.type === 'page-error').map(d => d.msg))];
    if (pageErrors.length) saveNote += ` · MCA page script errors during this phase: ${pageErrors.slice(0, 3).join(' | ')}`;

    const saveBlocked = !!r.save?.validationErrors?.length;
    const dlg = r.dialogs.length ? ` · ${r.dialogs.length} page dialog(s) auto-closed (see Logs)` : '';
    const hid = r.hidden ? ` · Not on form ${r.hidden}` : '';
    showMessage(r.failed || saveBlocked ? 'warning' : 'success',
      `${phase.label}: Filled ${r.filled} · Skipped ${r.skipped}${hid} · Failed ${r.failed}${resetNote}${dlg}${saveNote}`, 30000);
    btn.textContent = `${r.filled} filled`;
    const selectDebug = r.details.filter(d => d.debug).map(d => ({ id: d.id, ...d.debug }));
    // Per-field trace in the shape a human (or another tool) can scan without cross-referencing
    // ids against FIELD_MAPPINGS: which section/field, whether it was found, filled, and still
    // held its value after the final verify pass, falling back to r.details' own err message.
    const resetIds = new Set(r.reset.map(x => x.id));
    const fieldLog = r.details.map(d => ({
      section: phase.label,
      field: labelOf(d.id),
      detected: d.err !== 'element not found' && !/not found/i.test(d.err || ''),
      filled: !!d.ok && !resetIds.has(d.id),
      verified: !!d.ok && !resetIds.has(d.id),
      error: resetIds.has(d.id) ? 'MCA reset the value after it was filled' : (d.err || null)
    }));
    await Storage.saveLogs({
      action: 'fill', phase: phase.id, filled: r.filled, skipped: r.skipped, hidden: r.hidden,
      failed: r.failed, failures: r.details.filter(d => !d.ok), resetByMca: r.reset,
      verifyTimedOut: !!r.verifyTimedOut,
      notOnForm: r.details.filter(d => d.hidden).map(d => d.id),
      via: r.details.filter(d => d.via).map(d => `${d.id}:${d.via}`).join(' '),
      selectDebug: selectDebug.length ? selectDebug : undefined,
      fieldLog,
      dialogs: r.dialogs, save: r.save
    });
    var phaseResult = {
      ok: !saveBlocked && (!autoSubmit || !!r.save?.clicked || !!r.save?.skipped),
      failed: r.failed,
      failures: r.details.filter(d => !d.ok),
      reset: r.reset,
      save: r.save,
      tabId: tab.id
    };
  } catch (e) {
    const message = describeInjectError(e);
    showMessage('error', `${message}`, 20000);
    await Storage.saveLogs({ action: 'fill', error: message, raw: e.message, filledSoFar: r.filled, failures: r.details.filter(d => !d.ok) });
    var phaseResult = { ok: false, error: message };
  } finally {
    if (!deferReset) setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 2500);
  }
  return phaseResult;
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function pageAlive(tabId) {
  try {
    await withTimeout(chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => true }), 3000, 'dead');
    return true;
  } catch (_) { return false; }
}

// Injection errors that mean the page is between states (reloading, navigating, re-rendering)
// rather than broken; the caller waits for the page to settle and retries once.
function isTransientInjectError(e) {
  return /frame with id .*(was removed|is showing error page)|document is not available|page is still loading|keeps loading|could not establish connection|no frame with id|frame was detached|target closed/i
    .test(String(e?.message || e));
}

function describeInjectError(e) {
  const m = String(e?.message || e);
  if (/no tab with id|tab was closed/i.test(m)) return 'The MCA tab was closed. Reopen the AOC-4 form on mca.gov.in, then click Fill Form to resume from this phase.';
  if (/cannot access (contents of|a chrome)|missing host permission|cannot be scripted/i.test(m)) return 'The active tab is not the MCA AOC-4 form (or it moved to a page the extension cannot access). Open the form on mca.gov.in and retry.';
  if (isTransientInjectError(m)) return 'The MCA page reloaded or navigated away while filling. Wait for it to load completely, then click Fill Form to resume from this phase.';
  return m;
}

// Busy reasons that persisted for the whole wait budget are treated as a permanent page
// feature (e.g. a decorative element whose class says "loader") and no longer waited on.
const ignoredBusyReasons = new Set();

// Waits until MCA is idle: page loaded, no pending AJAX, no loading overlay, no popup.
// Popups are closed with their OK/Continue button and reported in `dialogs`.
async function waitForMcaIdle(tabId, context, budgetMs = 120000) {
  const started = Date.now();
  const dialogs = [];
  let announced = false;
  while (true) {
    let out;
    try {
      const [res] = await withTimeout(chrome.scripting.executeScript({
        target: { tabId }, world: 'MAIN', func: pageWaitForIdle, args: [10000]
      }), 20000, 'idle-timeout');
      out = res?.result;
    } catch (e) {
      if (e.message === 'idle-timeout' || isTransientInjectError(e)) {
        // Page thread is blocked or the page is reloading: wait for it to answer again.
        if (!announced) { showMessage('info', `MCA page is not responding — waiting before ${context}…`, 30000); announced = true; }
        await sleep(3000);
        if (Date.now() - started >= budgetMs) {
          throw new Error(`The MCA page stopped responding before ${context}. Close any dialog on the MCA tab (reload it if needed), then click Fill Form to resume from this phase.`);
        }
        continue;
      }
      throw e;
    }
    if (!out) return { idle: true, dialogs, waitedMs: Date.now() - started };
    dialogs.push(...(out.dialogs || []));
    if (out.serverError) {
      throw new Error(`MCA server problem ("${out.serverError}"). Wait a minute, reload the AOC-4 form tab and sign in again if asked, then click Fill Form to resume from this phase.`);
    }
    if (out.idle) return { idle: true, dialogs, waitedMs: Date.now() - started };
    if (ignoredBusyReasons.has(out.reason)) return { idle: false, dialogs, ignored: out.reason, waitedMs: Date.now() - started };
    if (Date.now() - started >= budgetMs) {
      ignoredBusyReasons.add(out.reason);
      await Storage.saveLogs({ action: 'busyIgnored', reason: out.reason, context, waitedMs: Date.now() - started });
      return { idle: false, dialogs, ignored: out.reason, waitedMs: Date.now() - started };
    }
    announced = true;
    showMessage('info', `${out.reason} — waiting before ${context}… (${Math.round((Date.now() - started) / 1000)}s)`, 30000);
  }
}

async function installDialogGuard(tabId) {
  try {
    await withTimeout(chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: pageInstallDialogGuard }), 5000, 'guard-timeout');
  } catch (_) { /* the per-call overrides in pageFill/pageSave still cover the critical moments */ }
}

async function readGuardDialogs(tabId) {
  try {
    const [res] = await withTimeout(chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: pageReadGuardDialogs }), 5000, 'guard-timeout');
    return res?.result || [];
  } catch (_) { return []; }
}

async function getMcaSessionStatus(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN',
      func: () => {
        const url = location.href.toLowerCase();
        const text = (document.body?.innerText || '').slice(0, 12000).toLowerCase();
        const expiredMessage = /session(?:\s+has)?\s+(?:expired|timed\s*out)|please\s+(?:log\s*in|sign\s*in)\s+again|login\s+again/.test(text);
        const loginRoute = /\/(?:login|signin|sign-in|userlogin)(?:[/?#]|$)/.test(url);
        const passwordLogin = !!document.querySelector('input[type="password"]')
          && [...document.querySelectorAll('button, input[type="submit"], [role="button"]')]
            .some(el => /log\s*in|sign\s*in/i.test(el.textContent || el.value || ''));
        return { expired: expiredMessage || loginRoute || passwordLogin, url: location.href };
      }
    });
    return result?.result || { expired: false };
  } catch (_) {
    // A temporary script-injection error is handled by the next field operation.
    return { expired: false };
  }
}

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))
  ]);
}

const MCA_TAB_URL = /mca\.gov\.in/;
async function getActiveMcaTab() {
  if (RUN.windowMode) {
    if (RUN.tabId) {
      try {
        const tab = await chrome.tabs.get(RUN.tabId);
        if (tab?.url && MCA_TAB_URL.test(tab.url)) return tab;
      } catch (_) { /* that tab was closed */ }
    }
    // The remembered tab is gone: use the MCA tab that is active or was used most recently.
    const tabs = await chrome.tabs.query({ url: ['https://www.mca.gov.in/*', 'https://*.mca.gov.in/*'] });
    tabs.sort((a, b) => Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
    if (!tabs[0]) return null;
    RUN.tabId = tabs[0].id;
    return tabs[0];
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !MCA_TAB_URL.test(tab.url)) return null;
  return tab;
}

function currentPhase() {
  const id = Number(document.getElementById('phaseSelect').value) || 1;
  return PHASES.find(p => p.id === id) || PHASES[0];
}

function phaseFields(phaseId) {
  return FIELD_MAPPINGS.filter(f => f.phase === phaseId && f.kind !== 'waitFor' && f.kind !== 'addRows' && !f.manualOnly);
}

const OPTIONAL_GROUP_DATA_KEYS = {
  serviceProvider: ['SERVICE_PROVIDER_NAME', 'SERVICE_PROVIDER_IP', 'SERVICE_PROVIDER_LOCATION', 'SERVICE_PROVIDER_ADDRESS']
};

function hasOptionalGroupData(data, group) {
  const keys = OPTIONAL_GROUP_DATA_KEYS[group];
  return !!keys && keys.some(key => String(data?.[key] ?? '').trim() !== '');
}

function isIdentifierField(field) {
  const identity = `${field.key || ''} ${field.id || ''} ${field.label || ''}`;
  return /\b(CIN|PAN|DIN|PIN|SRN|GSTIN|TAN)\b/i.test(identity)
    || /(?:^|_)(?:MEMBER_NUMBER|MEMBERSHIP_NUMBER|FIRM_REG)(?:_|$)/i.test(identity);
}

function isZeroIdentifier(field, value) {
  return isIdentifierField(field) && /^0+$/.test(String(value ?? '').trim());
}

function buildJobs(data, phaseId) {
  const jobs = [];
  const rawLeaseDetails = data.OPERATING_LEASE_DETAILS;
  const hasLeaseDetails = typeof rawLeaseDetails === 'string' && !!rawLeaseDetails.trim();
  // The old summary P&L rows (revenue, other income, other expenses) write a TOTAL into a single
  // MCA box: all revenue into "Sale or supply of services", all other income into "Other
  // non-operating income", and other expenses including purchases/stock change/audit fees/power
  // into "Other expenses". When the client file has the line-by-line profitLossDetails, those same
  // boxes are filled correctly by the PL_* rows — so the summary rows must not run, otherwise the
  // two jobs fight over one box (the final check then "fixes" it back and forth, and if a detail
  // row is not found the wrong total stays in an STP form that cannot be resubmitted).
  // The same goes for the other summary rows (employee, finance, depreciation, managerial
  // remuneration): each has a line-by-line twin that fills the very same MCA box, so running
  // both only fills the box twice. A summary row is skipped whenever its twin has a value.
  const SUMMARY_PL_TWIN = {
    pl_rev: 'PL_DOMESTIC_SERVICES', pl_oi: 'PL_OTHER_NONOPERATING_INCOME', pl_oth: 'PL_OTHER_EXPENSES',
    pl_emp: 'PL_EMPLOYEE_BENEFITS', pl_fin: 'PL_FINANCE_COSTS', pl_dep: 'PL_DEPRECIATION',
    pl_mgr: 'PL_MANAGERIAL_REMUNERATION'
  };
  const hasValue = key => data[key] !== undefined && data[key] !== null && data[key] !== '';
  const twinFilled = f => {
    const m = /^(pl_(?:rev|oi|oth|emp|fin|dep|mgr))_(cur|prev)$/.exec(f.id || '');
    return !!m && hasValue(`${SUMMARY_PL_TWIN[m[1]]}_${m[2].toUpperCase()}`);
  };
  for (const f of FIELD_MAPPINGS) {
    if (f.phase !== phaseId) continue;
    if (f.manualOnly) continue;
    if (twinFilled(f)) continue;
    if (f.id === 'FP_LEASE_DETAILS' && !hasLeaseDetails) continue;
    if (f.optionalGroup && !hasOptionalGroupData(data, f.optionalGroup)) continue;
    const v = f.id === 'FP_LEASE' ? (hasLeaseDetails ? 'Yes' : 'No') : data[f.key];
    const empty = v === undefined || v === null || v === '';
    const kind = f.kind || 'text';
    if (!empty && isZeroIdentifier(f, v)) {
      throw new Error(`${f.label}: client data contains "0" for an identifier. Correct the value in the client JSON; this field was not filled.`);
    }
    // Most of the section stays hidden until MCA loads the company from the CIN, so always check that first.
    if (kind === 'waitFor') {
      jobs.push({
        id: f.id, kind, selector: f.selector, index: 0, value: '',
        timeout: f.id === 'CIN_WAIT' && empty ? 1500 : (f.timeout || 10000),
        noCin: f.id === 'CIN_WAIT' && empty, nudge: f.nudge || null
      });
      continue;
    }
    if (kind === 'addRows') {
      let need = f.need || 2;
      if (f.id === 'FS_ADD_ROWS') {
        const fsCount = Object.keys(data).filter(k => /^FS_SIG_\d+_DIN$/.test(k) && data[k]).length;
        need = Math.max(fsCount, 2);
      } else if (f.id === 'BR_ADD_ROWS') {
        const brCount = Object.keys(data).filter(k => /^BR_SIG_\d+_DIN$/.test(k) && data[k]).length;
        need = Math.max(brCount, 2);
      } else if (f.id === 'PROD_ADD_ROWS') {
        need = Math.max(Number(data.TOTAL_CATEGORIES) || 1, 1);
        // The MCA form already starts with exactly 1 category row, so there is nothing to add
        // and nothing to risk for the (overwhelmingly common) single-category case: skip the job
        // entirely rather than let it go hunting for an "Add" button it doesn't need. Its global
        // last-resort selector (any button[class*="addRow"] on the whole page) is what has to be
        // avoided here — clicking the wrong table's Add button elsewhere on this long form would
        // explain fields in other phases going missing too.
        if (need <= 1) continue;
      }
      jobs.push({ id: f.id, kind, selector: f.selector, index: 0, need, value: '' });
      continue;
    }
    if (empty) continue;
    const job = {
      id: f.id,
      kind,
      name: f.name || null,
      selector: f.kind === 'pinCode' ? (f.pinSelector || null) : (f.selector || null),
      nameSelector: f.nameSelector || null,
      desigSelector: f.desigSelector || null,
      mcaOwned: !!f.mcaOwned,
      index: f.index || 0,
      dateInRow: !!f.dateInRow,
      onlyIfEmpty: !!f.onlyIfEmpty,
      optional: !!f.optional,
      typeChars: !!f.typeChars,
      selectSuggestion: !!f.selectSuggestion,
      commitEnter: !!f.commitEnter,
      waitForSelector: f.waitForSelector && String(v).toLowerCase() === 'yes' ? f.waitForSelector : null,
      waitForSectionHeading: f.waitForSectionHeading && String(v).toLowerCase() === 'yes' ? f.waitForSectionHeading : null,
      waitForFieldLabel: f.waitForFieldLabel && String(v).toLowerCase() === 'yes' ? f.waitForFieldLabel : null,
      sectionHeading: f.sectionHeading || null,
      fieldLabel: f.fieldLabel || null,
      columnIndex: Number.isInteger(f.columnIndex) ? f.columnIndex : 0,
      rowOccurrence: Number.isInteger(f.rowOccurrence) ? f.rowOccurrence : 0,
      requireSemantic: !!f.requireSemantic,
      revealTrigger: !!f.revealTrigger,
      triggerIndex: Number.isInteger(f.triggerIndex) ? f.triggerIndex : 0,
      triggerScope: f.triggerScope || null,
      doneSelector: f.doneSelector || null,
      timeout: f.timeout || 0,
      waitAfterMs: f.waitAfterMs || 0,
      pinSelector: f.pinSelector || null,
      areaSelector: f.areaSelector || null,
      citySelector: f.citySelector || null,
      waitSentinel: f.waitSentinel || null,
      value: kind === 'date' ? toDDMMYYYY(v) : String(v)
    };
    if (f.optionMap) {
      const o = f.optionMap[String(v)];
      if (!o) throw new Error(`${f.label}: "${v}" is not one of ${Object.keys(f.optionMap).join(' / ')}`);
      job.optionRe = o.re;
      job.optionNot = o.not || null;
    }
    jobs.push(job);
  }
  // Section IV supports more than one product/service category: PROD_ADD_ROWS (above) clicks
  // "Add" until there are enough rows, then each extra row (2, 3, ...) is filled here by
  // reusing the same column selectors as row 1 with `index: n - 1` to pick that row's cell —
  // the same technique the FS/BR signatory tables use for their own repeated rows. Row 1's data
  // keys stay CATEGORY_CODE/HIGHEST_CODE/... (unprefixed, handled by the FIELD_MAPPINGS loop
  // above); row 2+ keys are CATEGORY_2_CODE, HIGHEST_2_CODE, etc.
  if (phaseId === 7) {
    const PROD_ROW_COLUMNS = [
      { idSuffix: 'CATEGORY_CODE', dataSuffix: 'CODE', dataPrefix: 'CATEGORY', kind: 'text', selector: 'input[aria-label*="category code"]' },
      { idSuffix: 'CATEGORY_DESC', dataSuffix: 'DESC', dataPrefix: 'CATEGORY', kind: 'text', selector: 'input[aria-label*="Description of the product or service category"]' },
      { idSuffix: 'CATEGORY_TURNOVER', dataSuffix: 'TURNOVER', dataPrefix: 'CATEGORY', kind: 'number', selector: 'input[aria-label*="Turnover of the product or service category"]' },
      { idSuffix: 'HIGHEST_CODE', dataSuffix: 'CODE', dataPrefix: 'HIGHEST', kind: 'text', selector: 'input[aria-label*="Highest turnover contributing product"]' },
      { idSuffix: 'HIGHEST_DESC', dataSuffix: 'DESC', dataPrefix: 'HIGHEST', kind: 'text', selector: 'input[aria-label*="Description of the product or service"]:not([aria-label*="category"])' },
      { idSuffix: 'HIGHEST_TURNOVER', dataSuffix: 'TURNOVER', dataPrefix: 'HIGHEST', kind: 'number', selector: 'input[aria-label*="Turnover of highest contributing product"]' }
    ];
    const totalCategories = Math.max(Number(data.TOTAL_CATEGORIES) || 1, 1);
    for (let n = 2; n <= totalCategories; n++) {
      for (const col of PROD_ROW_COLUMNS) {
        const dataKey = `${col.dataPrefix}_${n}_${col.dataSuffix}`;
        const v = data[dataKey];
        if (v === undefined || v === null || v === '') continue;
        jobs.push({
          id: `PROD_ROW${n}_${col.idSuffix}`, kind: col.kind, selector: col.selector, index: n - 1,
          onlyIfEmpty: false, revealTrigger: true, triggerIndex: 0, triggerScope: 'product or service category',
          columnIndex: 0, rowOccurrence: 0, requireSemantic: false,
          value: String(v)
        });
      }
    }
  }
  return jobs;
}

// Arguments for pageSave: this phase's validation labels and Part A's labels for the other half.
// Save selection stays tied to the phase anchor/index, matching the older working flow.
function buildSaveArgs(phase) {
  const labelsFor = phaseId => FIELD_MAPPINGS.filter(field => field.phase === phaseId)
    .flatMap(field => [field.fieldLabel, field.label].filter(Boolean));
  const phaseValidationLabels = labelsFor(phase.id);
  // Part A (Q1–12) saves with one button: a Phase 1 or Phase 2 Save is also judged by the other half's errors.
  const partnerLabels = phase.id === 1 ? labelsFor(2) : phase.id === 2 ? labelsFor(1) : [];
  return {
    phaseValidationLabels,
    partnerLabels,
    saveArgs: [phase.saveIndex, phase.saveAnchor || null, phase.id, phaseValidationLabels, partnerLabels]
  };
}

function toDDMMYYYY(s) {
  const p = String(s).trim().split(/[\/\-\.]/);
  if (p.length !== 3) return String(s);
  let [d, m, y] = p[0].length === 4 ? [p[2], p[1], p[0]] : p;
  if (y.length === 2) y = '20' + y;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

// Serialized into the page by executeScript: must be self-contained (no outer references).
