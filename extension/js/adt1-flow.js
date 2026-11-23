// ADT-1 "Start" flow (MVP): make sure an MCA tab is open, wait while a person signs in by hand
// (ID, password, captcha, OTP are never touched here), open Form ADT-1, then run Phase 1 (Company
// Information: CIN, wait for autofill, Next) and Phase 2 (Appointment and Auditor Details: fill, Save).
// The attachment / declaration steps are manual and are not touched.
//
// Runs in the side panel (it stays open while the person works in the MCA tab). Needs
// window.Adt1Engine.run (Phase 1) and window.Adt1Engine.runAppointment (Phase 2) from adt1-engine.js.

(function (root) {
  "use strict";

  const ADT1_URL = 'https://www.mca.gov.in/content/mca/global/en/mca/e-filing/complianceServices/ADT-1.html';
  const LOGIN_URL = 'https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html';
  const MCA_URLS = ['https://www.mca.gov.in/*', 'https://*.mca.gov.in/*'];
  const LOGIN_WAIT_MS = 20 * 60 * 1000;   // MCA also needs a captcha + OTP; give the person time
  const FORM_READY_MS = 60 * 1000;
  const NEXT_STEP_MS = 30 * 1000;
  const POLL_MS = 1500;

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // Self-contained (serialized into the page by executeScript, MAIN world). Reads only: whether the
  // person is signed in, which page this is, and which ADT-1 step is on screen. It never reads or
  // touches the login form's fields.
  function pageProbe() {
    const rendered = el => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
    const q = s => { try { return [...document.querySelectorAll(s)].find(rendered) || null; } catch (_) { return null; } };
    const welcome = document.getElementById('welcomeUser');
    const hello = welcome ? (welcome.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const url = location.href;
    return {
      url,
      ready: document.readyState,
      loggedIn: /^hello\b/i.test(hello) && !q('input[type="password"]'),
      user: hello,
      onLogin: /fologin|\/login/i.test(url) || !!q('input[type="password"]'),
      onAdt1: /\/ADT-1\.html/i.test(url),
      formReady: !!window.guideBridge && typeof window.guideBridge.visit === 'function',
      companyStep: !!q('input[name="guideContainer-rootPanel-panel_710365359-panel-panel-guidetextbox___jqName"]'),
      appointmentStep: !!q('[name*="panel_710365359-panel_8730171-"]'),
    };
  }

  // Self-contained (serialized into the page by executeScript, MAIN world). While installed it looks twice
  // a second for an MCA popup (an HTML dialog/modal, wherever it appears) and presses its OK / Continue /
  // Close button, like a person would. It never touches the login fields, never answers a dialog that
  // contains inputs (a form), and never presses anything on a delete / discard / log-out question, with one
  // exception: "Continue Session" (MCA's session-timeout popup) is always pressed to keep the session alive.
  // A "saved successfully" popup is left alone for a few seconds so the Save / Next step can read it first.
  //   mode 'install' | 'remove' | 'drain' (returns and clears the list of popups it closed)
  function pagePopupWatcher(mode) {
    if (mode === 'remove') { const w = window.__g8PopupWatcher; if (w) { clearInterval(w.timer); delete window.__g8PopupWatcher; } return { removed: !!w }; }
    if (mode === 'drain') { const l = window.__g8Popups || []; return l.splice(0, l.length); }
    if (window.__g8PopupWatcher) return { installed: true, already: true };
    const log = window.__g8Popups = window.__g8Popups || [];
    const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
    const rendered = el => !!el && (el.offsetParent !== null || el.getClientRects().length > 0) && getComputedStyle(el).visibility !== 'hidden';
    const DIALOG = '[role="dialog"], [role="alertdialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .bootbox, .sweet-alert, [class*="modal" i], [class*="dialog" i], [class*="popup" i]';
    const STRICT = '[role="dialog"], [role="alertdialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup';
    const BTN = 'button, input[type="button"], input[type="submit"], a[role="button"], a.btn, [role="button"]';
    const labelOf = b => clean(b.textContent || b.value || b.getAttribute('aria-label'));
    const PRESS = /^(ok|okay|continue|continue session|proceed|got it|ok, got it)$/i;
    const PRESS_CLOSE = /^(close|done|dismiss)$/i;
    const DESTRUCTIVE = /\b(delete|discard|remove|reset|clear all|log ?out|sign ?out|leave (?:this )?page|cancel (?:the )?filing|terminate|submit|pay now|e-?sign|file (?:this )?form)\b/i;
    const SUCCESS = /successfully|data saved|saved\b/i, BAD = /\b(not|unable|fail|failed|error|invalid)\b/i;
    const isOverlay = el => {
      for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.position === 'fixed' || (cs.position === 'absolute' && (parseInt(cs.zIndex, 10) || 0) > 0)) return true;
        if (n.getAttribute('role') === 'dialog' || n.getAttribute('role') === 'alertdialog') return true;
      }
      return false;
    };
    const firstSeen = new WeakMap(), lastPressed = new WeakMap();
    const installedAt = Date.now(), TTL = 30 * 60 * 1000;
    const tick = () => {
      if (Date.now() - installedAt > TTL) { const w = window.__g8PopupWatcher; if (w) clearInterval(w.timer); delete window.__g8PopupWatcher; return; }
      for (const box of document.querySelectorAll(DIALOG)) {
        if (!rendered(box)) continue;
        // Innermost dialog only (a wrapper that merely contains another visible dialog is skipped).
        if ([...box.querySelectorAll(DIALOG)].some(rendered)) continue;
        const text = clean(box.innerText || box.textContent);
        if (!text || text.length > 600) continue;
        if (!isOverlay(box)) continue;
        if ([...box.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea')].some(rendered)) continue;
        const buttons = [...box.querySelectorAll(BTN)].filter(rendered);
        if (!buttons.length) continue;
        const keep = buttons.find(b => /^continue session$/i.test(labelOf(b)));
        let btn = keep || buttons.find(b => PRESS.test(labelOf(b)));
        if (!btn && box.matches(STRICT)) btn = buttons.find(b => PRESS_CLOSE.test(labelOf(b)));
        if (!btn) continue;
        let body = text; for (const b of buttons) { const l = labelOf(b); if (l) body = body.split(l).join(' '); }
        body = clean(body);
        if (!keep) {
          if (DESTRUCTIVE.test(body)) continue;
          if (SUCCESS.test(body) && !BAD.test(body)) {
            if (!firstSeen.has(box)) firstSeen.set(box, Date.now());
            if (Date.now() - firstSeen.get(box) < 5000) continue;   // let the Save / Next step read it first
          }
        }
        if (Date.now() - (lastPressed.get(box) || 0) < 1500) continue;
        lastPressed.set(box, Date.now());
        log.push({ text: body.slice(0, 120), button: labelOf(btn), at: Date.now() });
        if (log.length > 40) log.shift();
        try { btn.click(); } catch (_) { }
      }
    };
    window.__g8PopupWatcher = { timer: setInterval(tick, 500), installedAt };
    return { installed: true };
  }

  async function runInPage(tabId, func, args) {
    try {
      const r = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args: args || [] });
      return (r && r[0] && r[0].result) || null;
    } catch (_) { return null; }
  }
  // Popup closer + native alert/confirm guard. Safe to call again and again: it only installs once per page load.
  async function ensureGuards(tabId) {
    await runInPage(tabId, pagePopupWatcher, ['install']);
    if (typeof pageInstallDialogGuard === 'function') await runInPage(tabId, pageInstallDialogGuard);
  }
  async function dropGuards(tabId) {
    const closed = (await runInPage(tabId, pagePopupWatcher, ['drain'])) || [];
    await runInPage(tabId, pagePopupWatcher, ['remove']);
    if (typeof pageUninstallDialogGuard === 'function') await runInPage(tabId, pageUninstallDialogGuard);
    return Array.isArray(closed) ? closed : [];
  }

  async function probe(tabId) {
    try {
      const r = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: pageProbe });
      return (r && r[0] && r[0].result) || null;
    } catch (_) {
      return null;   // page still loading / navigating / not scriptable yet
    }
  }

  // onEvent({ stage, text, state }) stage: tab | login | open | phase1 | phase2 | done, state: active | done | error.
  function start(data, onEvent) {
    let cancelled = false;
    const emit = (stage, text, state) => { try { if (typeof onEvent === 'function') onEvent({ stage, text, state: state || 'active' }); } catch (_) { } };
    const stopped = () => cancelled;

    async function waitFor(tabId, test, timeoutMs, onTick) {
      const until = Date.now() + timeoutMs;
      let last = null;
      while (Date.now() < until && !stopped()) {
        let tab = null;
        try { tab = await chrome.tabs.get(tabId); } catch (_) { return { gone: true }; }
        last = tab.status === 'complete' || tab.status === 'loading' ? await probe(tabId) : null;
        if (last && test(last)) return { p: last };
        if (onTick) onTick(last, Date.now() - (until - timeoutMs));
        await sleep(POLL_MS);
      }
      return { timeout: !stopped(), cancelled: stopped(), p: last };
    }

    async function findOrOpenTab() {
      const all = await chrome.tabs.query({ url: MCA_URLS });
      // A tab holding another MCA form (an e-filing page that is not ADT-1) is never navigated away.
      const tabs = all.filter(t => !(/\/e-filing\//i.test(t.url || '') && !/\/ADT-1\.html/i.test(t.url || '')));
      tabs.sort((a, b) => Number(/ADT-1\.html/i.test(b.url || '')) - Number(/ADT-1\.html/i.test(a.url || '')) || Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
      if (tabs[0]) { emit('tab', 'Using the MCA tab that is already open'); return tabs[0]; }
      emit('tab', all.length ? 'Your other MCA tabs hold other forms: opening a new tab' : 'MCA is not open: opening it');
      return chrome.tabs.create({ url: ADT1_URL, active: true });
    }

    const focusTab = async tab => {
      try { await chrome.tabs.update(tab.id, { active: true }); } catch (_) { }
      try { if (tab.windowId != null) await chrome.windows.update(tab.windowId, { focused: true }); } catch (_) { }
    };

    async function runInner(holder) {
      const engine = root.Adt1Engine;
      if (!engine || typeof engine.run !== 'function') return { ok: false, stage: 'tab', message: 'The ADT-1 engine did not load. Reload the extension.' };
      const hasPhase2 = typeof engine.runAppointment === 'function';
      const wantsPhase2 = !!(data && (data.natureOfAppointment || data.auditorCategory || data.dateOfAppointment));

      // 1. A tab on MCA.
      let tab;
      try { tab = await findOrOpenTab(); } catch (e) { return { ok: false, stage: 'tab', message: 'Could not open MCA: ' + (e && e.message || e) }; }
      holder.tabId = tab.id;
      emit('tab', 'MCA tab ready', 'done');
      if (stopped()) return { ok: false, stage: 'tab', message: 'Stopped.' };

      // 2. Signed in, on the ADT-1 form, form model loaded.
      let probeNow = await probe(tab.id);
      const onAdtUrl = /\/ADT-1\.html/i.test(tab.url || '');
      for (let i = 0; !probeNow && onAdtUrl && i < 4; i++) { await sleep(1000); probeNow = await probe(tab.id); }   // page still loading: do not reload it
      if (probeNow ? !probeNow.onAdt1 : !onAdtUrl) {
        emit('open', 'Opening Form ADT-1');
        try { await chrome.tabs.update(tab.id, { url: ADT1_URL }); } catch (e) { return { ok: false, stage: 'open', message: 'Could not open ADT-1: ' + (e && e.message || e) }; }
      }

      let announcedLogin = false;
      const needLogin = p => !!p && (p.onLogin || !p.loggedIn) && !p.formReady;
      const ready = p => !!p && p.onAdt1 && p.formReady && (p.companyStep || p.appointmentStep);
      const until = Date.now() + LOGIN_WAIT_MS;
      let navigatedAfterLogin = false;
      let formWaitStarted = 0;
      for (;;) {
        if (stopped()) return { ok: false, stage: 'login', message: 'Stopped.' };
        if (Date.now() > until) return { ok: false, stage: 'login', message: 'Waited ' + Math.round(LOGIN_WAIT_MS / 60000) + ' minutes for the MCA sign-in. Click Start again after signing in.' };
        let t = null;
        try { t = await chrome.tabs.get(tab.id); } catch (_) { return { ok: false, stage: 'tab', message: 'The MCA tab was closed. Click Start again.' }; }
        const p = (t.status === 'complete' || t.status === 'loading') ? await probe(tab.id) : null;
        if (p && (p.loggedIn || p.formReady)) await ensureGuards(tab.id);   // popups are pressed OK for you once you are signed in (login errors stay visible)
        if (ready(p)) { emit('login', p.user ? 'Signed in as ' + p.user.replace(/^hello\s*/i, '') : 'Signed in', 'done'); emit('open', 'ADT-1 form is open', 'done'); break; }
        if (p && needLogin(p)) {
          if (!announcedLogin) { announcedLogin = true; await focusTab(t); }
          emit('login', 'Sign in on the MCA tab (ID, password, captcha, OTP). Waiting…');
          navigatedAfterLogin = false; formWaitStarted = 0;
        } else if (p && p.loggedIn) {
          // Signed in but not (yet) on the ADT-1 form: go there once, then wait for the form to load.
          if (!p.onAdt1 && !navigatedAfterLogin) {
            navigatedAfterLogin = true;
            emit('login', 'Signed in', 'done');
            emit('open', 'Opening Form ADT-1');
            try { await chrome.tabs.update(tab.id, { url: ADT1_URL }); } catch (_) { }
          } else {
            if (!formWaitStarted) formWaitStarted = Date.now();
            emit('open', 'Waiting for the ADT-1 form to load');
            if (Date.now() - formWaitStarted > FORM_READY_MS) return { ok: false, stage: 'open', message: 'Signed in, but the ADT-1 form did not load within ' + FORM_READY_MS / 1000 + 's. Open Form ADT-1 yourself, then click Start again.' };
          }
        }
        await sleep(POLL_MS);
      }
      if (stopped()) return { ok: false, stage: 'open', message: 'Stopped.' };

      await ensureGuards(tab.id);
      // 3. Phase 1, unless the form is already past it.
      let p1Msg = 'Phase 1 skipped (the form is already on the Appointment step)';
      let cur = await probe(tab.id);
      if (cur && cur.companyStep) {
        emit('phase1', 'Starting Phase 1: Company Information');
        const r1 = await engine.run(tab.id, data, text => emit('phase1', text));
        if (!r1 || !r1.ok) return { ok: false, stage: 'phase1', message: (r1 && r1.message) || 'Phase 1 failed.' };
        p1Msg = 'Phase 1 done: CIN filled, MCA autofilled, Next clicked';
        emit('phase1', p1Msg, 'done');
        if (stopped()) return { ok: false, stage: 'phase1', message: 'Stopped after Phase 1.' };
        const nxt = await waitFor(tab.id, p => p.appointmentStep, NEXT_STEP_MS);
        if (!nxt.p || !nxt.p.appointmentStep) return { ok: false, stage: 'phase2', message: 'Phase 1 finished but the Appointment step did not appear. Check the page, then click Start again.' };
      } else if (!cur || !cur.appointmentStep) {
        return { ok: false, stage: 'phase1', message: 'The ADT-1 Company Information step is not on screen.' };
      } else {
        emit('phase1', p1Msg, 'done');
      }

      await ensureGuards(tab.id);
      // 4. Phase 2.
      if (!hasPhase2) return { ok: true, stage: 'done', message: p1Msg + '. Phase 2 is not available in this build.' };
      if (!wantsPhase2) return { ok: true, stage: 'done', message: p1Msg + '. No appointment data was given, so Phase 2 was skipped.' };
      emit('phase2', 'Starting Phase 2: Appointment and Auditor Details');
      const r2 = await engine.runAppointment(tab.id, data, text => emit('phase2', text), { goNext: true, isCancelled: stopped });
      if (!r2 || !r2.ok) return { ok: false, stage: 'phase2', message: (r2 && r2.message) || 'Phase 2 failed.', phase2: r2 || null };
      emit('phase2', r2.advanced ? 'Phase 2 done: Next opened the next step' : 'Phase 2 done: details filled, but Next did not move on', 'done');
      const warn = [];
      if ((r2.autoChosen || []).length) warn.push('Chosen automatically, please check: ' + r2.autoChosen.join('; '));
      if ((r2.notShown || []).length) warn.push('Not shown on MCA, so not entered: ' + r2.notShown.join(', '));
      return { ok: true, stage: 'done', message: (r2.advanced
        ? 'Phases 1 and 2 are done and the form is now on the next step. Phases 3 and 4 (attachments, declaration) are yours: continue on the MCA page.' + (warn.length ? ' ' + warn.join('. ') + '.' : '')
        : 'Phases 1 and 2 are done but the form is still on the Appointment step: ' + (r2.message || '') + ' Check it on the MCA page.'), phase2: r2 };
    }

    async function run() {
      const holder = { tabId: null };
      let res;
      try { res = await runInner(holder); }
      catch (e) { res = { ok: false, stage: 'tab', message: String((e && e.message) || e) }; }
      if (holder.tabId != null) {
        const closed = await dropGuards(holder.tabId);
        if (closed.length) {
          res.popups = closed;
          res.message += ' ' + closed.length + ' MCA popup' + (closed.length > 1 ? 's were' : ' was') + ' closed automatically (OK): ' + closed.slice(0, 3).map(c => '"' + String(c.text || '').slice(0, 60) + '"').join(', ') + '.';
        }
      }
      return res;
    }

    const promise = run().catch(e => ({ ok: false, stage: 'tab', message: String((e && e.message) || e) }));
    return { promise, cancel: () => { cancelled = true; } };
  }

  root.Adt1Flow = { start, ensureGuards, dropGuards, ADT1_URL, LOGIN_URL };
})(typeof window !== 'undefined' ? window : globalThis);
