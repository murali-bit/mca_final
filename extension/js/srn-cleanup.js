// Bulk-cancel of draft SRNs on MCA's "My Application" page (Pending for Action tab).
// MCA reloads and drops you on the home page after every cancel, so the loop lives here, in the side
// panel: open the page, press Cancel SRN on the first draft, press Yes on "confirm cancel", wait for the
// reload, open the page again, repeat. Only rows whose status is "Draft/Pending Submission" are ever touched.

// Serialized into the page by executeScript (MAIN world): must be self-contained.
//   'list'        -> { url, rows[{text,form,cin,entity,status,eligible}], empty, loggedOut }  (opts.loadAll scrolls to load more rows)
//   'cancelFirst' -> { clicked, none, err, info }  presses Cancel SRN on the first eligible row, then Yes
async function pageSrn(action, opts) {
  opts = opts || {};
  const pause = ms => new Promise(res => setTimeout(res, ms));
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const rendered = el => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  const labelOf = e => clean(e.tagName === 'INPUT' ? e.value : e.textContent);
  const cancels = () => {
    const set = new Set();
    for (const e of document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], span, div')) {
      if (!/^cancel srn$/i.test(labelOf(e)) || !rendered(e)) continue;
      if (e.children.length !== 0 && e.tagName !== 'INPUT') continue;
      set.add(e.closest('button, a, input, [role="button"]') || e);
    }
    return [...set];
  };
  const HEADER = /sr\.?\s*no\.?.*form.*identification/i;
  const rowOf = (btn, all) => {
    let row = btn;
    for (let p = btn.parentElement, i = 0; p && i < 10; p = p.parentElement, i++) {
      const n = all.filter(c => p.contains(c)).length;
      const t = clean(p.innerText);
      if (n !== 1 || t.length > 700 || HEADER.test(t)) break;
      row = p;
    }
    return row;
  };
  const parse = row => {
    const text = clean(row.innerText);
    const cin = (text.match(/\b[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/) || [])[0] || '';
    const form = (text.match(/\b(?:AOC-4(?: XBRL| CFS)?|MGT-7A?|ADT-[13]|INC-\d+[A-Z]?|DIR-\d+(?: KYC)?|SPICe\+?(?: Part [AB])?|MSME-1|DPT-3|CHG-\d+|PAS-\d+|SH-\d+|NDH-\d+|FC-\d+)\b/i) || text.match(/\b[A-Z]{2,6}-\d+[A-Z]?\b/) || [])[0] || '';
    const eligible = /draft\s*\/?\s*pending submission/i.test(text);
    const status = eligible ? 'Draft/Pending Submission' : ((text.match(/under processing|approved|ntbr|rejected|cancelled|resubmi\w*/i) || [])[0] || '');
    const after = cin ? text.split(cin).slice(1).join(' ') : '';
    const entity = clean(after.split(/\b(?:Offline|Online|Draft)/i)[0]).slice(0, 80);
    return { text: text.slice(0, 220), form, cin, entity, status, eligible };
  };

  if (action === 'list') {
    const url = location.href;
    const loggedOut = /login|signin|sign-in/i.test(url) || !!document.querySelector('input[type="password"]');
    if (opts.loadAll) {
      let last = -1;
      for (let i = 0; i < 10; i++) {
        const all = cancels();
        if (all.length === last) break;
        last = all.length;
        try { window.scrollTo(0, document.body.scrollHeight); } catch (_) { }
        const tail = all[all.length - 1];
        for (let p = tail && tail.parentElement; p; p = p.parentElement) {
          if (p.scrollHeight > p.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(p).overflowY)) p.scrollTop = p.scrollHeight;
        }
        await pause(900);
      }
    }
    const all = cancels();
    const rows = all.map(b => parse(rowOf(b, all)));
    const body = clean(document.body.innerText);
    const empty = !rows.length && /pending for action/i.test(body) && /no (records?|data|applications?|results?)( found| available)?/i.test(body);
    // After a cancel MCA shows "Please select relevant tab to view results": no tab is selected yet.
    const needTab = !rows.length && /please select relevant tab/i.test(body);
    return { url, rows, empty, loggedOut, needTab };
  }

  // Press the "Pending for Action" tab button.
  if (action === 'openPending') {
    const el = [...document.querySelectorAll('button, a, [role="button"], [role="tab"], li, span, div')]
      .find(e => rendered(e) && /^pending for action$/i.test(clean(e.textContent)) && (e.children.length === 0 || /^(BUTTON|A)$/.test(e.tagName)));
    if (!el) return { clicked: false };
    try { (el.closest('button, a, [role="button"]') || el).click(); } catch (_) { return { clicked: false }; }
    return { clicked: true };
  }

  // Click MCA's own "My Application" link (what a person does from the menu), wherever it sits on the page.
  if (action === 'openLink') {
    const links = [...document.querySelectorAll('a[href]')];
    let a = links.find(x => /application-history/i.test(x.getAttribute('href') || ''));
    if (!a) a = links.find(x => /^my application$/i.test(clean(x.textContent)));
    if (!a) return { clicked: false };
    try { a.click(); } catch (_) { return { clicked: false }; }
    return { clicked: true, href: a.getAttribute('href') || '' };
  }

  if (action === 'cancelFirst') {
    const filter = clean(opts.filter).toLowerCase();
    const all = cancels();
    let target = null;
    for (const b of all) {
      const row = rowOf(b, all), info = parse(row);
      if (!info.eligible) continue;
      if (filter && !info.text.toLowerCase().includes(filter)) continue;
      target = { b, row, info }; break;
    }
    if (!target) return { clicked: false, none: true };
    try { target.row.scrollIntoView({ block: 'center' }); } catch (_) { }
    await pause(300);
    target.b.click();
    // MCA's "confirm cancel" popup: "SRN selected will be cancelled. Do you want to proceed?"  No / Yes
    let yes = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 10000 && !yes) {
      await pause(250);
      const boxes = [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode, div')]
        .filter(e => rendered(e) && /srn selected will be cancelled/i.test(clean(e.innerText)) && clean(e.innerText).length < 400)
        .sort((a, b) => clean(a.innerText).length - clean(b.innerText).length);
      for (const m of boxes) {
        yes = [...m.querySelectorAll('button, input[type="button"], a, [role="button"]')].find(x => rendered(x) && /^yes$/i.test(labelOf(x))) || null;
        if (yes) break;
      }
    }
    if (!yes) return { clicked: false, err: 'the "confirm cancel" popup did not appear', info: target.info };
    await pause(200);
    yes.click();
    return { clicked: true, info: target.info };
  }
  return { err: 'unknown action ' + action };
}

(function (root) {
  "use strict";
  if (root.SrnCleanup) return;

  const HISTORY_URL = 'https://www.mca.gov.in/content/mca/global/en/application-history.html';
  const sleep = ms => new Promise(res => setTimeout(res, ms));
  const inject = (tabId, args, ms) => Promise.race([
    chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: pageSrn, args }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('The MCA page stopped responding.')), ms))
  ]).then(r => r && r[0] && r[0].result);

  // The MCA tab to work in: the active one, else any MCA tab, else a new one opened on My Application.
  async function findTab() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const mca = tabs.filter(t => /(^|\.)mca\.gov\.in/i.test(new URL(t.url || 'about:blank').hostname));
    const hit = mca.find(t => t.active) || mca[0];
    if (hit) return { tab: hit, created: false };
    return { tab: await chrome.tabs.create({ url: HISTORY_URL }), created: true };
  }

  async function waitComplete(tabId, ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      try { const t = await chrome.tabs.get(tabId); if (t.status === 'complete') return true; } catch (_) { return false; }
      await sleep(400);
    }
    return false;
  }

  async function gotoHistory(tabId) {
    const t = await chrome.tabs.get(tabId);
    if (!/application-history/i.test(t.url || '')) {
      await chrome.tabs.update(tabId, { url: HISTORY_URL });
      await sleep(700);
    }
    await waitComplete(tabId, 45000);
  }

  // Poll until the list shows rows (or says it is empty, or MCA asks for a sign-in).
  async function waitList(tabId, loadAll) {
    const until = Date.now() + 30000;
    let last = null, lastPress = 0;
    while (Date.now() < until) {
      try {
        const r = await inject(tabId, ['list', {}], 15000);
        last = r;
        if (r && r.needTab && Date.now() - lastPress > 3000) { lastPress = Date.now(); await inject(tabId, ['openPending', {}], 10000); }
        if (r && r.loggedOut) return r;
        if (r && r.rows && r.rows.length) return loadAll ? (await inject(tabId, ['list', { loadAll: true }], 90000)) : r;
        if (r && r.empty) return r;
      } catch (_) { /* page still loading */ }
      await sleep(800);
    }
    return last || { rows: [], timeout: true };
  }

  // Wait until My Application shows its list (rows, or "no records", or a sign-in page). null if it never does.
  async function listShown(tabId, ms) {
    const until = Date.now() + ms;
    let lastPress = 0;
    while (Date.now() < until) {
      try {
        const r = await inject(tabId, ['list', {}], 10000);
        if (r && (r.loggedOut || r.empty || (r.rows && r.rows.length))) return r;
        // No tab selected after MCA's reload: press "Pending for Action" (not more than every 3 s).
        if (r && r.needTab && Date.now() - lastPress > 3000) { lastPress = Date.now(); await inject(tabId, ['openPending', {}], 10000); }
      } catch (_) { /* still loading */ }
      await sleep(700);
    }
    return null;
  }

  // Get the tab back onto My Application. After a cancel MCA lands on its home page, and opening the
  // address directly may be bounced there again, so try the site's own link first, then the address
  // (with and without #), then Back. Reports where MCA sent the tab if none of them works.
  async function openHistory(tabId) {
    const t0 = await chrome.tabs.get(tabId);
    if (/application-history/i.test(t0.url || '')) {
      await waitComplete(tabId, 45000);
      if (await listShown(tabId, 15000)) return { ok: true, how: 'already open' };
    }
    const tries = [
      ['the My Application link', async () => { const r = await inject(tabId, ['openLink', {}], 15000).catch(() => null); return !!(r && r.clicked); }],
      ['the address with #', async () => { await chrome.tabs.update(tabId, { url: HISTORY_URL + '#' }); return true; }],
      ['the address', async () => { await chrome.tabs.update(tabId, { url: HISTORY_URL }); return true; }],
      ['Back', async () => { try { await chrome.tabs.goBack(tabId); return true; } catch (_) { return false; } }]
    ];
    const log = [];
    for (const [name, go] of tries) {
      let started = false;
      try { started = await go(); } catch (_) { started = false; }
      if (!started) { log.push(name + ': not possible'); continue; }
      await sleep(900);
      await waitComplete(tabId, 45000);
      const r = await listShown(tabId, 14000);
      if (r) return { ok: true, how: name, loggedOut: !!r.loggedOut };
      const t = await chrome.tabs.get(tabId).catch(() => null);
      log.push(name + ' ended on ' + (t && t.url ? t.url : 'an unknown page'));
    }
    return { ok: false, log };
  }

  const matches = (row, filter) => row.eligible && (!filter || row.text.toLowerCase().includes(filter));

  // Which drafts are there? Summary only: nothing is cancelled.
  async function scan(tabId, opts) {
    const filter = String((opts && opts.filter) || '').trim().toLowerCase();
    const nav = await openHistory(tabId);
    if (!nav.ok) return { ok: false, message: 'Could not open My Application. Tried: ' + nav.log.join('; ') + '. Open it yourself once, then scan again.' };
    const list = await waitList(tabId, true);
    if (list.loggedOut) return { ok: false, message: 'MCA is asking you to sign in. Sign in on that tab, then scan again.' };
    const rows = list.rows || [];
    const hit = rows.filter(r => matches(r, filter));
    const byKey = {};
    for (const r of hit) { const k = (r.form || '?') + ' · ' + (r.entity || r.cin || '?'); byKey[k] = (byKey[k] || 0) + 1; }
    return {
      ok: true, total: rows.length, eligible: hit.length, notDraft: rows.filter(r => !r.eligible).length,
      groups: Object.entries(byKey).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, count: n })),
      message: rows.length ? hit.length + ' draft(s) can be cancelled' + (filter ? ' (matching "' + filter + '")' : '') + ', ' + (rows.length - hit.length) + ' other row(s) will be left alone.'
        : (list.empty ? 'Pending for Action is empty.' : 'No rows were found: the list did not load or this is not the My Application page.')
    };
  }

  // onEvent({ state: 'active'|'done'|'warn'|'error', text, cancelled, remaining, row })
  async function run(tabId, opts, onEvent) {
    opts = opts || {};
    const emit = (state, text, extra) => { try { if (onEvent) onEvent(Object.assign({ state, text }, extra || {})); } catch (_) { } };
    const filter = String(opts.filter || '').trim().toLowerCase();
    const max = opts.max > 0 ? opts.max : Infinity;
    const stopped = () => !!(opts.isCancelled && opts.isCancelled());
    let cancelled = 0, strikes = 0, same = 0, lastSig = '';
    const finish = (ok, message, extra) => Object.assign({ ok, cancelled, message }, extra || {});
    try {
      while (cancelled < max) {
        if (stopped()) return finish(true, 'Stopped by you after ' + cancelled + ' cancelled.', { stopped: true });
        emit('active', 'Opening My Application' + (cancelled ? ' (' + cancelled + ' cancelled so far)' : ''), { cancelled });
        const nav = await openHistory(tabId);
        if (!nav.ok) return finish(false, 'Could not get back to My Application after ' + cancelled + ' cancelled. Tried: ' + nav.log.join('; ') + '.');
        const list = await waitList(tabId, false);
        if (list.loggedOut) return finish(false, 'MCA is asking you to sign in again. Sign in on that tab and press Cancel all again: it carries on with what is left.');
        const eligible = (list.rows || []).filter(r => matches(r, filter));
        if (!eligible.length) return finish(true, cancelled ? 'Done: ' + cancelled + ' cancelled, nothing left to cancel' + (filter ? ' for "' + filter + '"' : '') + '.' : 'Nothing to cancel' + (filter ? ' for "' + filter + '"' : '') + '.', { empty: true });

        // Cancelling changes the list. Four identical lists in a row mean the cancel is not going through.
        const sig = eligible.length + '|' + eligible.slice(0, 5).map(r => r.text).join('~');
        if (sig === lastSig) { if (++same >= 3) return finish(false, 'The list did not change after ' + same + ' cancels in a row, so I stopped. Try one by hand: does MCA show an error after Yes?'); }
        else { same = 0; lastSig = sig; }

        emit('active', 'Cancelling #' + (cancelled + 1) + ' (' + eligible.length + ' draft(s) on the page)', { cancelled, remaining: eligible.length });
        let res = null, reloaded = false;
        try { res = await inject(tabId, ['cancelFirst', { filter }], 30000); }
        catch (_) { reloaded = true; }                       // the page reloaded while the call was running: Yes went through
        if (!reloaded && res && !res.clicked) {
          if (res.none) return finish(true, 'Done: ' + cancelled + ' cancelled, nothing left to cancel.', { empty: true });
          if (++strikes >= 3) return finish(false, 'Stopped: ' + (res.err || 'could not press Cancel SRN') + ' (3 tries).');
          emit('warn', (res.err || 'could not press Cancel SRN') + ': trying again', { cancelled });
          await sleep(1500);
          continue;
        }
        strikes = 0;
        cancelled++;
        emit('done', 'Cancelled #' + cancelled + ((res && res.info && (res.info.form || res.info.entity)) ? ': ' + [res.info.form, res.info.entity].filter(Boolean).join(' · ') : ''), { cancelled, row: res && res.info });

        // MCA reloads the page (and lands on its home page): wait for that, then the loop opens My Application again.
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) { try { if ((await chrome.tabs.get(tabId)).status === 'loading') break; } catch (_) { break; } await sleep(200); }
        await waitComplete(tabId, 45000);
        await sleep(opts.delayMs || 1200);
      }
      return finish(true, 'Reached your limit of ' + cancelled + ' cancelled.', { limit: true });
    } catch (e) {
      return finish(false, (e && e.message) || String(e));
    }
  }

  root.SrnCleanup = { findTab, scan, run, HISTORY_URL };
})(typeof window !== "undefined" ? window : globalThis);
