// ADT-1, Step 1 "Company Information": put the CIN in, wait for MCA to fill the company name,
// address and email, then click Next. The CIN is written through pageFill (js/page-automation.js),
// the same model-aware engine the full ADT-1 fill uses; the Next click follows AOC-4's pageSave.

// Serialized into the page by executeScript: must be self-contained (no outer references).
// opts.sel maps cin/name/address/email to the CSS selectors from js/field-maps/adt1.js; the visible
// label is the fallback when a selector no longer matches.
async function pageAdt1(action, opts) {
  opts = opts || {};
  const sel = opts.sel || {};
  const pause = ms => new Promise(res => setTimeout(res, ms));
  const rendered = el => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const CONTROLS = 'input:not([type="hidden"]), textarea, select';
  const LABELS = {
    cin: 'corporate identity number',
    name: 'name of the company',
    address: 'address of the registered office',
    email: 'email id of the company'
  };

  function find(key) {
    if (sel[key]) {
      let hit = null;
      try { hit = [...document.querySelectorAll(sel[key])].find(rendered); } catch (_) { }
      if (hit) return hit;
    }
    const n = LABELS[key];
    const controls = [...document.querySelectorAll(CONTROLS)].filter(rendered);
    const byAria = controls.find(c => norm(c.getAttribute('aria-label')).includes(n));
    if (byAria) return byAria;
    for (const l of document.querySelectorAll('label[for]')) {
      if (!rendered(l) || !norm(l.textContent).includes(n)) continue;
      const t = document.getElementById(l.htmlFor);
      if (t && rendered(t) && t.matches(CONTROLS)) return t;
    }
    return null;
  }
  const valueOf = el => !el ? '' : el.tagName === 'SELECT' ? (el.options[el.selectedIndex] && el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '') : (el.value || '');
  const BUTTONS = 'button, input[type="button"], input[type="submit"], a, [role="button"]';
  const labelOf = b => (b.textContent || b.value || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const isNext = b => /^next\b/i.test(labelOf(b)) && labelOf(b).length <= 12;
  const enabled = b => !b.disabled && b.getAttribute('aria-disabled') !== 'true' && !/\bdisabled\b/i.test(b.className || '');
  // MCA's own scripts may raise a native alert (for example on an unknown CIN); a native dialog would
  // freeze the page thread and this script with it, so record the text and carry on instead.
  const dialogs = [];
  const savedDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  const muteDialogs = () => {
    window.alert = m => { dialogs.push(String(m)); };
    window.confirm = m => { dialogs.push(String(m)); return true; };
    window.prompt = (m, d) => { dialogs.push(String(m)); return d ?? ''; };
  };
  const restoreDialogs = () => { Object.assign(window, savedDialogs); };
  // The AEM form model node behind a widget: "<id>_widget" on the element, "<id>" on the node.
  const modelNodeOf = el => {
    const gb = window.guideBridge;
    if (!el || !gb || typeof gb.visit !== 'function') return null;
    const id = (el.id || '').replace(/_widget$/, '');
    let node = null;
    try { gb.visit(c => { if (c && c.id === id) node = c; }); } catch (_) { }
    return node;
  };

  if (action === 'locate') {
    document.querySelectorAll('[data-g8-adt1]').forEach(e => e.removeAttribute('data-g8-adt1'));
    const found = {};
    for (const key of Object.keys(LABELS)) {
      const el = find(key);
      found[key] = !!el;
      if (el) el.setAttribute('data-g8-adt1', key);
    }
    return { found, cinValue: valueOf(find('cin')).trim(), cinTag: (find('cin') || {}).tagName || null, nameFilled: !!valueOf(find('name')).trim() };
  }

  // pageFill skips a field that already holds the wanted value, and AEM skips a model write of the
  // value it already holds (which is what runs MCA's CIN lookup), so the key-by-key retry needs both
  // the box and the model node empty.
  if (action === 'clearCin') {
    const el = find('cin');
    if (!el || el.tagName !== 'INPUT') return { cleared: false };
    el.setAttribute('data-g8-adt1', 'cin');
    let modelCleared = false;
    muteDialogs();
    try {
      const node = modelNodeOf(el);
      if (node) { try { node.value = null; modelCleared = true; } catch (_) { } }
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await pause(200);
    } finally { restoreDialogs(); }
    return { cleared: true, modelCleared, dialogs };
  }

  // Wait for MCA to fill the company name, let the page settle, then report each field. A field
  // that could not be located is reported as not found, which is not the same as empty.
  if (action === 'status') {
    const read = () => {
      const state = {};
      for (const key of ['name', 'address', 'email']) {
        const el = find(key);
        state[key] = { found: !!el, filled: !!valueOf(el).trim() };
      }
      return state;
    };
    muteDialogs();
    try {
      const until = Date.now() + (opts.timeout || 0);
      while (!read().name.filled && Date.now() < until) await pause(250);
      if (read().name.filled) {
        // MCA keeps rewriting fields for a few seconds after the name arrives.
        const snap = () => [...document.querySelectorAll('input, select, textarea')]
          .map(e => (e.type === 'radio' || e.type === 'checkbox') ? (e.checked ? 1 : 0) : e.value).join('\u0001');
        let last = snap(), quietSince = Date.now();
        const hardStop = Date.now() + 15000;
        while (Date.now() - quietSince < 2500 && Date.now() < hardStop) {
          await pause(400);
          const s = snap();
          if (s !== last) { last = s; quietSince = Date.now(); }
        }
      }
    } finally { restoreDialogs(); }
    // What MCA says about the CIN box itself (for example "Invalid CIN"), if anything.
    const cinEl = find('cin');
    const cinError = cinEl ? [...(cinEl.closest('.guideFieldNode, .guideFieldWidget') || cinEl.parentElement || document).querySelectorAll('.guideFieldError, [role="alert"]')]
      .filter(rendered).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)[0] || '' : '';
    return { state: read(), dialogs, cinError };
  }

  if (action === 'next') {
    muteDialogs();

    // MCA may answer with a small "saved successfully" popup that must be closed with OK.
    const closeSuccessDialog = () => {
      const nodes = [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode, div')]
        .filter(n => {
          if (!rendered(n)) return false;
          const t = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim();
          return t.length <= 400 && /successfully|saved/i.test(t);
        })
        .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      for (const n of nodes) {
        const ok = [...n.querySelectorAll(BUTTONS)].find(c => rendered(c) && /^(ok|okay|close|confirm|proceed|done)$/i.test(labelOf(c)));
        if (ok) { dialogs.push((n.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80)); ok.click(); return true; }
      }
      return false;
    };

    try {
      closeSuccessDialog();
      // The button may only enable a moment after the autofill; wait for it like a person would.
      let btn = null, state = 'none';
      const waitUntil = Date.now() + 12000;
      while (Date.now() < waitUntil) {
        const found = [...document.querySelectorAll(BUTTONS)].filter(b => rendered(b) && isNext(b));
        if (found.length) {
          const ready = found.find(enabled);
          state = ready ? 'ready' : 'disabled';
          if (ready) { btn = ready; break; }
        }
        await pause(300);
      }
      if (!btn) {
        const seen = [...new Set([...document.querySelectorAll(BUTTONS)].filter(rendered).map(labelOf).filter(t => t && t.length <= 30))].slice(0, 12);
        return { clicked: false, err: (state === 'disabled' ? 'the Next button stayed disabled' : 'no Next button was found') + ' (buttons on the page: ' + (seen.join(', ') || 'none') + ')' };
      }
      btn.scrollIntoView({ block: 'center' });
      await pause(300);
      btn.click();
      // The wizard hides Company Information once it moves on to the next step.
      const until = Date.now() + 20000;
      while (Date.now() < until) {
        await pause(300);
        closeSuccessDialog();
        if (!find('cin')) return { clicked: true, advanced: true, dialogs };
      }
      const errors = [...new Set([...document.querySelectorAll('.guideFieldError, [class*="error" i], [role="alert"]')]
        .filter(rendered).map(e => (e.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(t => t && t.length < 160))].slice(0, 5);
      return { clicked: true, advanced: false, dialogs, errors };
    } finally {
      restoreDialogs();
    }
  }
  // ---------------------------------------------------------------------------------------------
  // Phase 2 helpers: the "Appointment and Auditor Details" step.
  // UNVERIFIED AGAINST THE LIVE PAGE: written from the field-map selectors and the facts recorded
  // from the live Company Information step; the Appointment step itself could not be inspected.
  // ---------------------------------------------------------------------------------------------
  // Every control of that step carries this fragment in its name/id (including its Save button).
  const PANEL = opts.marker || 'panel_710365359-panel_8730171-';
  // Same notion of "on screen" as pageFill's own check (radios are often hidden behind a styled label).
  const shown = el => !!el && (el.type === 'radio'
    ? !!(el.getClientRects().length || (el.parentElement && el.parentElement.getClientRects().length))
    : el.getClientRects().length > 0);
  const inPanel = el => ((el.name || '') + ' ' + (el.id || '')).includes(PANEL);
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const compact = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  // One rule for "is this a date box" shared by save / recheck / commitField.
  const isDateBox = el => !!el && (el.placeholder === 'DD/MM/YYYY' || el.getAttribute('data-format') === 'DD/MM/YYYY'
    || !!el.closest('.guide-fw-datePicker, .datePicker, [data-guide-fieldType="guideDateTime"], [data-guide-fieldType="guideDatePicker"]'));
  const PLACEHOLDER = /^(?:select(?: here)?|choose(?: here)?|select one|dd\/mm\/yyyy)$/i;
  const radioTexts = r => [...new Set([r.getAttribute('aria-label'), ...(r.labels ? [...r.labels].map(l => l.textContent) : []), r.value].map(clean).filter(Boolean))];
  const fieldBox = el => el.closest('.guideFieldNode, fieldset, [role="radiogroup"], [role="group"]');
  // Lower-case words only, so a question can be matched whatever punctuation MCA puts in it.
  const normQ = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // The question around a bare Yes/No pair: the text of its field box minus the option words.
  // MCA's own validation message (.guideFieldError) sits inside that box after a failed Save; it is not part of the question.
  const questionTextOf = el => {
    const box = fieldBox(el);
    if (!box) return '';
    let t = clean(box.innerText || box.textContent);
    for (const e of box.querySelectorAll('.guideFieldError')) {
      const m = clean(e.innerText || e.textContent);
      const i = m ? t.lastIndexOf(m) : -1;
      if (i >= 0) t = t.slice(0, i) + ' ' + t.slice(i + m.length);
    }
    return t.replace(/\b(yes|no|not applicable)\b/gi, '').replace(/\s+/g, ' ').trim();
  };

  // Which wizard step is open: the Company Information CIN box, or any rendered control of the
  // Appointment panel.
  if (action === 'step') {
    const company = !!find('cin');
    const appointment = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')]
      .some(c => inPanel(c) && shown(c));
    return { company, appointment };
  }

  // Read the state of the named controls: opts.items = [{key, selector}]. With opts.wait, polls until
  // every item is on screen (AEM reveals dependent fields a moment after an answer).
  if (action === 'peek') {
    const items = opts.items || [];
    const read = () => {
      const out = {};
      for (const it of items) {
        let els = [];
        try { els = [...document.querySelectorAll(it.selector)]; } catch (_) { }
        const vis = els.filter(shown);
        const el = vis[0] || null;
        const o = { found: els.length > 0, rendered: vis.length > 0 };
        if (el) {
          o.tag = el.tagName; o.type = el.type; o.disabled = !!el.disabled; o.readOnly = !!el.readOnly;
          if (el.type === 'radio') {
            o.options = vis.map(radioTexts);
            const hit = vis.find(r => r.checked);
            o.checked = hit ? radioTexts(hit) : null;
            o.empty = !hit; o.value = hit ? (radioTexts(hit)[0] || '') : '';
          } else if (el.tagName === 'SELECT') {
            const t = el.options[el.selectedIndex] ? clean(el.options[el.selectedIndex].text) : '';
            o.empty = el.selectedIndex <= 0 || !el.value || PLACEHOLDER.test(t);
            o.value = o.empty ? '' : t;
            // The real choices (not "Select Here"): MCA fills the locality list a moment after the PIN.
            o.optionTexts = [...el.options].map(x => clean(x.text)).filter(x => x && !PLACEHOLDER.test(x));
          } else {
            const v = clean(el.value);
            o.empty = !v || PLACEHOLDER.test(v);
            o.value = o.empty ? '' : v;
          }
        }
        out[it.key] = o;
      }
      return out;
    };
    const until = Date.now() + (opts.wait || 0);
    let state = read();
    // opts.waitOptions: a rendered select also has to list at least one real option (PIN lookup).
    const pending = () => items.some(it => !state[it.key].rendered
      || (opts.waitOptions && state[it.key].tag === 'SELECT' && !(state[it.key].optionTexts || []).length));
    while (Date.now() < until && pending()) { await pause(200); state = read(); }
    return { state };
  }

  // Find the radio group of the Appointment step whose QUESTION text matches opts.pattern (a regex
  // source tested against the lower-cased, punctuation-free question). Bare Yes/No pairs carry the
  // question only in their surrounding field box. Waits up to opts.wait ms for it to render. Never
  // guesses: zero matches -> 'none', several -> 'ambiguous'.
  if (action === 'findQuestion') {
    let re;
    try { re = new RegExp(opts.pattern, opts.flags || 'i'); } catch (e) { return { status: 'error', err: 'bad question pattern: ' + e.message }; }
    const look = () => {
      const groups = new Map();
      for (const r of document.querySelectorAll('input[type="radio"]')) {
        if (!inPanel(r) || !shown(r)) continue;
        const k = r.name || ('#' + r.id);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      }
      const hits = [];
      for (const [name, els] of groups) {
        const q = questionTextOf(els[0]);
        if (q && re.test(normQ(q))) hits.push({ name, els, q });
      }
      return hits;
    };
    const until = Date.now() + (opts.wait || 0);
    let hits = look();
    while (!hits.length && Date.now() < until) { await pause(250); hits = look(); }
    if (!hits.length) return { status: 'none' };
    if (hits.length > 1) return { status: 'ambiguous', count: hits.length, texts: hits.map(h => h.q.slice(0, 90)) };
    const h = hits[0];
    if (!h.els[0].name) return { status: 'noname', text: h.q.slice(0, 90) };
    const checked = h.els.find(r => r.checked);
    return { status: 'found', name: h.els[0].name, text: h.q.slice(0, 140), options: h.els.map(radioTexts), checked: checked ? radioTexts(checked) : null };
  }

  // Wait until nothing on the form has changed for opts.quiet ms (max opts.max): lets MCA finish a
  // lookup such as the PIN code one, which rewrites city/district/state a moment after the PIN.
  if (action === 'settle') {
    muteDialogs();
    try {
      const snap = () => [...document.querySelectorAll('input, select, textarea')]
        .map(e => (e.type === 'radio' || e.type === 'checkbox') ? (e.checked ? 1 : 0) : e.value).join('\u0001');
      const quiet = opts.quiet || 1500, started = Date.now(), hardStop = started + (opts.max || 8000);
      let last = snap(), quietSince = Date.now(), changed = false;
      while (Date.now() < hardStop) {
        await pause(250);
        const s = snap();
        if (s !== last) { last = s; quietSince = Date.now(); changed = true; }
        else if (Date.now() - quietSince >= quiet) break;
      }
      return { changed, waitedMs: Date.now() - started };
    } finally { restoreDialogs(); }
  }

  // List the on-screen REQUIRED controls of the Appointment step that are still empty/unanswered
  // (including unanswered radio groups). Read-only: nothing is changed.
  if (action === 'scan') {
    const gb = window.guideBridge;
    let nodes = null;
    const nodeFor = el => {
      if (!gb || typeof gb.visit !== 'function') return null;
      if (!nodes) { nodes = new Map(); try { gb.visit(c => { if (c && c.id) nodes.set(c.id, c); }); } catch (_) { } }
      return nodes.get((el.id || '').replace(/-\d+_widget$/, '').replace(/_widget$/, '')) || null;
    };
    const labelTextsOf = el => {
      const out = [];
      // A radio's own label/aria-label names its OPTION ("Yes"), not the question: for those only
      // the surrounding question label counts.
      if (el.type !== 'radio' && el.type !== 'checkbox') {
        if (el.id) document.querySelectorAll('label[for]').forEach(l => { if (l.htmlFor === el.id) out.push(clean(l.textContent)); });
        if (el.labels) [...el.labels].forEach(l => out.push(clean(l.textContent)));
        out.push(clean(el.getAttribute('aria-label')));
      }
      const box = fieldBox(el);
      if (box && box.getAttribute && box.getAttribute('aria-label')) out.push(clean(box.getAttribute('aria-label')));
      if (box) {
        // First label that is not itself an option's label (those point at a radio/checkbox).
        const l = [...box.querySelectorAll('.guideFieldLabel, legend, label')].find(x => {
          const t = x.htmlFor && document.getElementById(x.htmlFor);
          return !(t && (t.type === 'radio' || t.type === 'checkbox'));
        });
        if (l) out.push(clean(l.textContent));
      }
      return out.filter(Boolean);
    };
    const isRequired = els => {
      for (const el of els) {
        const node = nodeFor(el);
        if (node && node.mandatory === true) return true;
        if (el.required || el.getAttribute('aria-required') === 'true') return true;
        if (labelTextsOf(el).some(t => /\*/.test(t))) return true;
        // A bare Yes/No pair carries its asterisk in the question text around it.
        if (el.type === 'radio' && /\*/.test(questionTextOf(el))) return true;
      }
      return false;
    };
    const generic = t => /^(yes|no|not applicable|enter here|select here)$/i.test(t);
    const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')]
      .filter(c => inPanel(c) && shown(c) && !c.disabled && !/^(button|submit|reset|image)$/.test(c.type)
        && (c.type === 'file' || !c.readOnly));
    const groups = new Map();
    for (const c of controls) {
      const key = (c.type === 'radio' || c.type === 'checkbox') && c.name ? 'g:' + c.type + ':' + c.name : c;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    const describe = els => {
      const first = els[0];
      const texts = els.flatMap(labelTextsOf).filter(t => !generic(t));
      if (texts.length) return texts[0];
      // A bare Yes/No pair: use the question text around it, minus the option words.
      const qText = questionTextOf(first);
      if (qText) return qText.slice(0, 200);
      // Last resort: name it by the control just before it on the page.
      const all = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(shown);
      for (let i = all.indexOf(first) - 1; i >= 0; i--) {
        const prev = labelTextsOf(all[i]).filter(t => !generic(t))[0];
        if (prev) return 'an unlabelled ' + (first.type === 'radio' ? 'Yes/No' : 'field') + ' question after "' + prev.slice(0, 80) + '"';
      }
      return 'an unlabelled ' + (first.type === 'radio' ? 'Yes/No' : 'field') + ' question';
    };
    const missing = [];
    for (const els of groups.values()) {
      const first = els[0];
      let empty;
      if (first.type === 'radio' || first.type === 'checkbox') empty = !els.some(e => e.checked);
      else if (first.tagName === 'SELECT') {
        const t = first.options[first.selectedIndex] ? clean(first.options[first.selectedIndex].text) : '';
        empty = first.selectedIndex <= 0 || !first.value || PLACEHOLDER.test(t);
      } else if (first.type === 'file') empty = !(first.files && first.files.length);
      else { const v = clean(first.value); empty = !v || PLACEHOLDER.test(v); }
      if (!empty || !isRequired(els)) continue;
      missing.push({
        label: describe(els).slice(0, 200),
        kind: first.type === 'radio' ? 'radio' : first.type === 'file' ? 'file' : first.tagName === 'SELECT' ? 'select' : 'text',
        // The full question text (normalised), so the caller can tell which known question this is.
        q: first.type === 'radio' ? normQ(questionTextOf(first)).slice(0, 500) : ''
      });
    }
    // A box MCA already marked as WRONG (not empty), e.g. "Please enter a valid PAN".
    for (const e of document.querySelectorAll('.guideFieldError')) {
      if (!e.getClientRects().length) continue;
      const text = clean(e.textContent);
      if (!text || /relevant details|mandatory|required/i.test(text) || !/valid|invalid|incorrect|not allowed|already|duplicate|format/i.test(text)) continue;
      const box = e.closest('.guideFieldNode, .guideFieldWidget') || e.parentElement;
      const inp = box && box.querySelector('input, select, textarea');
      if (!inp || !inPanel(inp)) continue;
      const lab = box.querySelector('label, .guideFieldLabel');
      missing.push({ label: (clean(lab && lab.textContent) || 'a field').slice(0, 120) + ' — MCA says: ' + text, kind: 'error', q: '' });
    }
    return { missing: missing.slice(0, 30), checked: groups.size };
  }

  // Click the Appointment step's own Save button and wait for MCA's answer. Never clicks Next.
  if (action === 'save') {
    muteDialogs();
    const pageMsgs = [];
    const isDone = t => /successfully|data saved|save done|record saved|form saved/i.test(t || '')
      && !/\b(not|unable|fail|failed|error|invalid)\b/i.test(t || '');
    const closeSuccess = () => {
      const nodes = [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode, div')]
        .filter(n => shown(n) && clean(n.innerText || n.textContent).length <= 400 && isDone(clean(n.innerText || n.textContent)))
        .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length);
      for (const n of nodes) {
        const ok = [...n.querySelectorAll(BUTTONS)].find(c => shown(c) && /^(ok|okay|close|confirm|proceed|done)$/i.test(labelOf(c)));
        if (ok) { const msg = clean(n.innerText).slice(0, 80); pageMsgs.push(msg); ok.click(); return msg; }
      }
      return '';
    };
    const jsErrors = [];
    const onErr = e => { const er = e && (e.error || e.reason); jsErrors.push(String((er && er.message) || (e && e.message) || er || 'error').slice(0, 200)); };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    try {
      closeSuccess();
      const saveButtons = () => [...document.querySelectorAll(BUTTONS)]
        .filter(b => shown(b) && (/\bsave\b/i.test(b.className || '') || /^save\b/i.test(labelOf(b))));
      let btn = null, state = 'none', via = '';
      const waitUntil = Date.now() + (opts.enableWait || 8000);
      while (Date.now() < waitUntil) {
        const all = saveButtons();
        let pool = all.filter(inPanel);
        via = 'appointment-panel';
        // Only one step of the wizard is on screen at a time, so a lone visible Save is this step's.
        if (!pool.length && all.length === 1) { pool = all; via = 'only-visible-save'; }
        if (pool.length) {
          const ready = pool.find(enabled);
          state = ready ? 'ready' : 'disabled';
          if (ready) { btn = ready; break; }
        }
        await pause(300);
      }
      if (!btn) {
        const seen = [...new Set([...document.querySelectorAll(BUTTONS)].filter(shown).map(labelOf).filter(t => t && t.length <= 30))].slice(0, 12);
        return { clicked: false, saved: false, dialogs, errors: [], err: (state === 'disabled'
          ? 'the Save button stayed disabled (MCA enables it once the required fields are answered)'
          : 'no Save button was found in the Appointment step') + ' (buttons on the page: ' + (seen.join(', ') || 'none') + ')' };
      }
      // AEM can overwrite the ISO date it holds with the displayed DD/MM/YYYY text; put the ISO back
      // before Save, as the AOC-4 save does.
      const gb = window.guideBridge;
      if (gb && typeof gb.visit === 'function') {
        const map = new Map();
        try { gb.visit(c => { if (c && c.id) map.set(c.id, c); }); } catch (_) { }
        for (const inp of document.querySelectorAll('input')) {
          if (!inPanel(inp) || !shown(inp) || !/^\d{2}\/\d{2}\/\d{4}$/.test(inp.value)) continue;
          const isDate = inp.placeholder === 'DD/MM/YYYY' || inp.getAttribute('data-format') === 'DD/MM/YYYY'
            || !!inp.closest('.guide-fw-datePicker, .datePicker, [data-guide-fieldType="guideDateTime"], [data-guide-fieldType="guideDatePicker"]');
          if (!isDate) continue;
          const node = map.get((inp.id || '').replace(/_widget$/, ''));
          const [dd, mm, yy] = inp.value.split('/');
          try { if (node && String(node.value == null ? '' : node.value) !== yy + '-' + mm + '-' + dd) node.value = yy + '-' + mm + '-' + dd; } catch (_) { }
        }
        await pause(200);
      }
      // AEM writes its Save validation messages into .guideFieldError; make sure none is hidden.
      document.querySelectorAll('.guideFieldError').forEach(e => { if (e.style.display === 'none' && !clean(e.textContent)) e.style.removeProperty('display'); });
      btn.scrollIntoView({ block: 'center' });
      await pause(300);
      btn.click();
      await pause(1200);
      const errorTexts = () => [...new Set([...document.querySelectorAll('.guideFieldError, [role="alert"]')]
        .filter(shown).map(e => clean(e.textContent)).filter(t => t && t.length <= 200))];
      const busy = () => {
        try { if (window.jQuery && window.jQuery.active > 0) return true; } catch (_) { }
        return [...document.querySelectorAll('.guide-loading, .guideLoading, .loading, .loader, .spinner, .blockUI, .blockOverlay, .ui-widget-overlay, [class*="spinner"], [class*="loading-overlay"]')]
          .some(e => shown(e) && e.getBoundingClientRect().width >= 8);
      };
      const clickedAt = Date.now();
      let savedDialog = '';
      while (Date.now() - clickedAt < 40000) {
        savedDialog = closeSuccess();
        if (savedDialog) break;
        const b = busy();
        if (!b && Date.now() - clickedAt >= 1500 && (errorTexts().length || dialogs.some(d => !isDone(d)))) break;
        if (!b && Date.now() - clickedAt >= 10000) break;
        await pause(250);
      }
      // A native alert()/confirm() raised by the click is MCA's verdict: a success text confirms the save.
      const nativeDone = dialogs.filter(isDone);
      const nativeBad = dialogs.filter(d => !isDone(d));
      const saved = !!savedDialog || nativeDone.length > 0;
      return { clicked: true, saved, via, dialogs: [...pageMsgs, ...dialogs], nativeMessages: nativeBad, errors: errorTexts().slice(0, 12), jsErrors: jsErrors.slice(0, 3) };
    } finally {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onErr);
      restoreDialogs();
    }
  }
  // Some AEM lists only load when the box is touched: focus and click the Area select, report its option count.
  // Enter a PIN code the way a person does: type it, then press Tab (focus moves to the next box).
  // MCA runs its locality lookup when the PIN box is LEFT, so the form model must still see the DOM
  // value as new at that moment: the model is written only as a second attempt, and the Area box is
  // clicked as a third. Returns how many localities MCA listed and which attempt produced them.
  // The rows of the 4(m) previous-tenure table: each row is a read-only "S. no." box followed by
  // (p) firm registration, (q) membership number, (r) FY start and (s) FY end. MCA creates one row per
  // financial year entered in 4(n). Returns, per row, the exact name of each control.
  if (action === 'priorRows') {
    const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(c => shown(c));
    const labelText = el => {
      const out = [];
      if (el.id) document.querySelectorAll('label[for]').forEach(l => { if (l.htmlFor === el.id) out.push(clean(l.textContent)); });
      if (el.labels) [...el.labels].forEach(l => out.push(clean(l.textContent)));
      out.push(clean(el.getAttribute('aria-label')));
      const box = el.closest('.guideFieldNode, .guideFieldWidget');
      if (box) { const l = box.querySelector('.guideFieldLabel, label'); if (l) out.push(clean(l.textContent)); }
      return out.filter(Boolean).join(' | ').toLowerCase();
    };
    const rows = [];
    let cur = null;
    for (const c of controls) {
      const lt = labelText(c);
      if (/\bs\.?\s*no\b/.test(lt)) { cur = { serial: clean(c.value), serialName: c.name || '' }; rows.push(cur); continue; }
      if (!cur) continue;
      if (/firm registration/.test(lt) && !cur.firmReg) cur.firmReg = c.name || '';
      else if (/membership number/.test(lt) && !cur.membership) cur.membership = c.name || '';
      else if (/start date/.test(lt) && !cur.fyStart) cur.fyStart = c.name || '';
      else if (/end date/.test(lt) && !cur.fyEnd) cur.fyEnd = c.name || '';
    }
    return { rows: rows.filter(r => r.membership || r.fyStart) };
  }

  if (action === 'pinTab') {
    muteDialogs();
    try {
      let pin = null, area = null;
      try { pin = [...document.querySelectorAll(opts.pinSelector)].find(shown) || null; } catch (_) { }
      try { area = [...document.querySelectorAll(opts.areaSelector)].find(shown) || null; } catch (_) { }
      if (!pin) return { ok: false, err: 'PIN box not found' };
      if (pin.disabled || pin.readOnly) return { ok: true, hidden: true, note: 'locked by MCA — skipped' };
      const value = String(opts.value || '').trim();
      const $ = window.jQuery;
      const setNative = (el, v) => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); if (d && d.set) d.set.call(el, v); else el.value = v; };
      const realOptions = () => area ? [...area.options].filter(o => o.value !== '' && !/^(select( here)?|choose)/i.test(clean(o.text))).length : 0;
      const waitFor = async ms => { const until = Date.now() + ms; while (Date.now() < until) { if (realOptions() > 0) return true; await pause(250); } return realOptions() > 0; };
      // focusable control after the PIN box, in page order (what Tab would move to)
      const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')].filter(c => shown(c) && !c.disabled && c.tabIndex !== -1);
      const idx = controls.indexOf(pin);
      const next = idx >= 0 ? controls[idx + 1] : null;
      const leave = () => {
        const k = { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true };
        let nativeBlur = false;
        const seen = () => { nativeBlur = true; };
        pin.addEventListener('blur', seen, { once: true });
        try { window.focus(); } catch (_) { }
        pin.dispatchEvent(new KeyboardEvent('keydown', k));
        pin.dispatchEvent(new Event('change', { bubbles: true }));
        if (next) { try { next.focus(); } catch (_) { } }
        if (document.activeElement === pin) { try { pin.blur(); } catch (_) { } }
        pin.removeEventListener('blur', seen);
        if (!nativeBlur) {
          // No native blur (the page window is not focused): send the events a Tab would have caused.
          pin.dispatchEvent(new FocusEvent('blur', { relatedTarget: next || null }));
          pin.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: next || null }));
          if (next) { try { next.dispatchEvent(new FocusEvent('focus')); next.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); } catch (_) { } }
        }
        pin.dispatchEvent(new KeyboardEvent('keyup', k));
        if ($) { try { $(pin).trigger('change').trigger('blur').trigger('focusout'); } catch (_) { } }
      };
      const type = async () => {
        pin.scrollIntoView({ block: 'center' });
        pin.focus();
        setNative(pin, '');
        pin.dispatchEvent(new Event('input', { bubbles: true }));
        for (const ch of value) {
          const k = { key: ch, code: 'Digit' + ch, bubbles: true };
          pin.dispatchEvent(new KeyboardEvent('keydown', k));
          pin.dispatchEvent(new KeyboardEvent('keypress', k));
          setNative(pin, pin.value + ch);
          pin.dispatchEvent(new Event('input', { bubbles: true }));
          pin.dispatchEvent(new KeyboardEvent('keyup', k));
          await pause(30);
        }
      };
      const already = !opts.force && pin.value.trim() === value && realOptions() > 0;
      if (already) return { ok: true, note: 'PIN already entered and localities listed', options: realOptions(), how: 'already' };
      // attempt 1: type + Tab (a person's way)
      await type();
      leave();
      if (await waitFor(opts.wait || 8000)) return { ok: true, options: realOptions(), how: 'typed and tabbed out' };
      if (opts.quick) return { ok: pin.value.trim() === value, options: 0, how: 'none' };
      // attempt 2: commit through the form model as well (fires AEM's value-commit script)
      const node = modelNodeOf(pin);
      if (node) { try { if (String(node.value == null ? '' : node.value) !== value) node.value = value; else { node.value = ''; await pause(100); node.value = value; } } catch (_) { } }
      leave();
      if (await waitFor(6000)) return { ok: true, options: realOptions(), how: 'form model commit' };
      // attempt 3: focus + click the Area box (some lists load on first touch)
      if (area) {
        try { area.scrollIntoView({ block: 'center' }); area.focus(); for (const t of ['mouseover', 'mousedown', 'mouseup', 'click']) area.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); if ($) $(area).trigger('focus').trigger('click'); } catch (_) { }
        if (await waitFor(4000)) return { ok: true, options: realOptions(), how: 'area box touched' };
      }
      return { ok: pin.value.trim() === value, options: 0, how: 'none', err: pin.value.trim() === value ? null : 'PIN shows "' + pin.value + '" instead of "' + value + '"' };
    } finally { restoreDialogs(); }
  }

  // Make MCA validate a box again with the value it holds now (clears a stale "valid PIN" style error that
  // was raised while the value was still being typed or before a related box was filled).
  // Every red message MCA shows right now, with the box it belongs to (name, label, state). Read-only.
  if (action === 'fieldErrors') {
    const labelsOf = el => {
      const out = [];
      if (el.type !== 'radio' && el.type !== 'checkbox') {
        if (el.id) document.querySelectorAll('label[for]').forEach(l => { if (l.htmlFor === el.id) out.push(clean(l.textContent)); });
        if (el.labels) [...el.labels].forEach(l => out.push(clean(l.textContent)));
        out.push(clean(el.getAttribute('aria-label')));
      }
      const box = el.closest('.guideFieldNode, .guideFieldWidget, fieldset, [role="radiogroup"]');
      if (box) { const l = [...box.querySelectorAll('.guideFieldLabel, legend, label')].find(x => { const tg = x.htmlFor && document.getElementById(x.htmlFor); return !(tg && (tg.type === 'radio' || tg.type === 'checkbox')); }); if (l) out.push(clean(l.textContent)); }
      return out.filter(Boolean);
    };
    const list = [];
    for (const e of document.querySelectorAll('.guideFieldError, [role="alert"]')) {
      if (!e.getClientRects().length) continue;
      const text = clean(e.textContent); if (!text) continue;
      let box = e.closest('.guideFieldNode, .guideFieldWidget, fieldset, [role="radiogroup"]');
      if (!box && e.parentElement && e.parentElement.querySelectorAll('input:not([type="hidden"]), select, textarea').length === 1) box = e.parentElement;
      const ctl = box ? [...box.querySelectorAll('input:not([type="hidden"]), select, textarea')].find(shown) || box.querySelector('input:not([type="hidden"]), select, textarea') : null;
      const item = { text, inPanel: !!(ctl && inPanel(ctl)) };
      if (ctl) {
        item.name = ctl.name || ''; item.id = ctl.id || ''; item.tag = ctl.tagName; item.type = ctl.type || '';
        item.labels = labelsOf(ctl);
        if (ctl.type === 'radio') { const grp = ctl.name ? [...document.querySelectorAll('input[type="radio"][name="' + ctl.name.replace(/"/g, '\\"') + '"]')] : [ctl]; item.empty = !grp.some(r => r.checked); item.q = normQ(questionTextOf(ctl)).slice(0, 300); }
        else if (ctl.tagName === 'SELECT') { const o = ctl.options[ctl.selectedIndex]; item.value = o ? clean(o.text) : ''; item.empty = ctl.selectedIndex <= 0 || !ctl.value || PLACEHOLDER.test(item.value); }
        else { item.value = clean(ctl.value); item.empty = !item.value || PLACEHOLDER.test(item.value); }
        item.readOnly = !!ctl.readOnly; item.disabled = !!ctl.disabled;
      } else item.labels = [];
      list.push(item);
    }
    return { errors: list.slice(0, 60) };
  }

  // Enter a value the way a person does: type it, then press Tab (focus leaves the box). Runs AEM's
  // exit/commit scripts, which is what clears a stale red message. Returns the box's red message afterwards.
  if (action === 'commitField') {
    muteDialogs();
    try {
      let el = null;
      try { el = [...document.querySelectorAll(opts.selector)].find(shown) || null; } catch (_) { }
      if (!el) return { ok: false, err: 'box not found' };
      if (el.disabled || el.readOnly) return { ok: true, hidden: true, note: 'locked by MCA — skipped' };
      const value = String(opts.value == null ? '' : opts.value).trim();
      const $ = window.jQuery;
      const setNative = (e, v) => { const d = Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'); if (d && d.set) d.set.call(e, v); else e.value = v; };
      el.scrollIntoView({ block: 'center' });
      try { window.focus(); } catch (_) { }
      el.focus();
      if (el.tagName === 'SELECT') {
        const want = compact(value);
        const real = [...el.options].filter(o => o.value !== '' && !PLACEHOLDER.test(clean(o.text)));
        const opt = real.find(o => compact(o.text) === want)
          || real.filter(o => want && compact(o.text) && (compact(o.text).startsWith(want) || want.startsWith(compact(o.text)))).sort((a, b) => compact(b.text).length - compact(a.text).length)[0]
          || real.filter(o => want && compact(o.text).includes(want)).sort((a, b) => compact(a.text).length - compact(b.text).length)[0];
        if (!opt) return { ok: false, err: 'option "' + value + '" not in list' };
        el.value = opt.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        var pickedIndex = [...el.options].indexOf(opt);
      } else if (clean(el.value) !== value) {
        setNative(el, ''); el.dispatchEvent(new Event('input', { bubbles: true }));
        for (const ch of value) {
          const k = { key: ch, bubbles: true };
          el.dispatchEvent(new KeyboardEvent('keydown', k)); el.dispatchEvent(new KeyboardEvent('keypress', k));
          setNative(el, el.value + ch); el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', k));
          await pause(12);
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const node = modelNodeOf(el);
      if (node && el.tagName !== 'SELECT') { try { let mv = value; if (/^\d{2}\/\d{2}\/\d{4}$/.test(value) && isDateBox(el)) { const [d, m, y] = value.split('/'); mv = y + '-' + m + '-' + d; } if (String(node.value == null ? '' : node.value) !== mv) node.value = mv; } catch (_) { } }
      // leave the box like Tab would
      const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')].filter(c => shown(c) && !c.disabled && c.tabIndex !== -1);
      const next = controls[controls.indexOf(el) + 1] || null;
      let nativeBlur = false; const seen = () => { nativeBlur = true; };
      el.addEventListener('blur', seen, { once: true });
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true }));
      if (next) { try { next.focus(); } catch (_) { } }
      if (document.activeElement === el) { try { el.blur(); } catch (_) { } }
      el.removeEventListener('blur', seen);
      if (!nativeBlur) { el.dispatchEvent(new FocusEvent('blur', { relatedTarget: next })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: next })); }
      if ($) { try { $(el).trigger('change').trigger('blur').trigger('focusout'); } catch (_) { } }
      await pause(opts.settleMs || 900);
      const box = el.closest('.guideFieldNode, .guideFieldWidget') || el.parentElement;
      const err = box ? [...box.querySelectorAll('.guideFieldError')].filter(e => e.getClientRects().length).map(e => clean(e.textContent)).filter(Boolean)[0] || '' : '';
      const now = el.tagName === 'SELECT' ? clean((el.options[el.selectedIndex] || {}).text) : clean(el.value);
      return { ok: el.tagName === 'SELECT' ? el.selectedIndex === pickedIndex : compact(now) === compact(value), value: now, error: err };
    } finally { restoreDialogs(); }
  }

  if (action === 'recheck') {
    muteDialogs();
    try {
      let el = null;
      try { el = [...document.querySelectorAll(opts.selector)].find(shown) || null; } catch (_) { }
      if (!el) return { found: false };
      if (opts.onlyIfError) {
        const b0 = el.closest('.guideFieldNode, .guideFieldWidget') || el.parentElement;
        const hasErr = b0 && [...b0.querySelectorAll('.guideFieldError')].some(x => x.getClientRects().length && clean(x.textContent));
        if (!hasErr) return { found: true, skipped: true };
      }
      const $ = window.jQuery, v = el.value;
      try { el.focus(); } catch (_) { }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      const node = modelNodeOf(el);
      if (node) { try { if (String(node.value == null ? '' : node.value) !== v) node.value = v; } catch (_) { } }
      try { el.blur(); } catch (_) { }
      el.dispatchEvent(new FocusEvent('blur'));
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      if ($) { try { $(el).trigger('change').trigger('blur').trigger('focusout'); } catch (_) { } }
      await pause(700);
      const box = el.closest('.guideFieldNode, .guideFieldWidget') || el.parentElement;
      const err = box ? [...box.querySelectorAll('.guideFieldError')].filter(e => e.getClientRects().length).map(e => clean(e.textContent)).filter(Boolean)[0] || '' : '';
      return { found: true, error: err };
    } finally { restoreDialogs(); }
  }

  if (action === 'pokeArea') {
    let el = null;
    try { el = document.querySelector(opts.selector); } catch (_) { }
    if (!el) return { found: false };
    try {
      el.scrollIntoView({ block: 'center' });
      el.focus();
      for (const type of ['mouseover', 'mousedown', 'mouseup', 'click']) el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
      if (window.jQuery) window.jQuery(el).trigger('focus').trigger('click');
    } catch (_) { }
    await pause(1500);
    try { el.blur(); } catch (_) { }
    return { found: true, options: el.options ? el.options.length : 0 };
  }

  // Click the Appointment step's own Next button (only called after a confirmed Save) and wait for the
  // wizard to leave this step. Never touches Previous or Save.
  if (action === 'nextStep') {
    muteDialogs();
    try {
      const done = t => /successfully|data saved|saved\b/i.test(t || '') && !/\b(not|unable|fail|failed|error|invalid)\b/i.test(t || '');
      const closeOk = () => {
        const nodes = [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode')]
          .filter(n => shown(n) && done(clean(n.innerText || n.textContent)) && clean(n.innerText || n.textContent).length <= 400);
        for (const n of nodes) {
          const ok = [...n.querySelectorAll(BUTTONS)].find(c => shown(c) && /^(ok|okay|close|confirm|proceed|done)$/i.test(labelOf(c)));
          if (ok) { dialogs.push(clean(n.innerText).slice(0, 80)); ok.click(); return true; }
        }
        return false;
      };
      const nextButtons = () => [...document.querySelectorAll(BUTTONS)]
        .filter(b => shown(b) && (/\bmoveNext\b/.test(b.className || '') || /^next\b/i.test(labelOf(b))) && labelOf(b).length <= 12
          && !b.closest('.ui-datepicker, .datepicker, .flatpickr-calendar'));
      let btn = null;
      const waitUntil = Date.now() + 8000;
      while (Date.now() < waitUntil) {
        const all = nextButtons();
        let pool = all.filter(inPanel);
        if (!pool.length && all.length === 1) pool = all;
        const ready = pool.find(enabled);
        if (ready) { btn = ready; break; }
        await pause(300);
      }
      if (!btn) return { clicked: false, advanced: false, err: 'no enabled Next button was found in the Appointment step' };
      // AEM can overwrite the ISO date it holds with the displayed DD/MM/YYYY text; put the ISO back
      // before the click, as the Save click did (Next runs the same validation).
      const gbN = window.guideBridge;
      if (gbN && typeof gbN.visit === 'function') {
        const map = new Map();
        try { gbN.visit(c => { if (c && c.id) map.set(c.id, c); }); } catch (_) { }
        for (const inp of document.querySelectorAll('input')) {
          if (!inPanel(inp) || !shown(inp) || !/^\d{2}\/\d{2}\/\d{4}$/.test(inp.value) || !isDateBox(inp)) continue;
          const node = map.get((inp.id || '').replace(/_widget$/, ''));
          const [dd, mm, yy] = inp.value.split('/');
          try { if (node && String(node.value == null ? '' : node.value) !== yy + '-' + mm + '-' + dd) node.value = yy + '-' + mm + '-' + dd; } catch (_) { }
        }
        await pause(200);
      }
      btn.scrollIntoView({ block: 'center' });
      await pause(300);
      btn.click();
      const stepOpen = () => [...document.querySelectorAll('input, select, textarea')].some(c => inPanel(c) && shown(c));
      const errTexts = () => [...new Set([...document.querySelectorAll('.guideFieldError, [role="alert"]')]
        .filter(shown).map(e => clean(e.textContent)).filter(x => x && x.length <= 200))];
      const clickedAt = Date.now();
      const until = clickedAt + 20000;
      while (Date.now() < until) {
        await pause(300);
        closeOk();
        if (!stepOpen()) return { clicked: true, advanced: true, dialogs };
        // MCA refused: its red messages are up and stable, so stop waiting.
        if (Date.now() - clickedAt > 3500 && errTexts().length) break;
      }
      return { clicked: true, advanced: false, dialogs, errors: errTexts().slice(0, 8) };
    } finally { restoreDialogs(); }
  }

  // Click the visible Previous button (the step after the Appointment one has its own) and wait for
  // the Appointment step's controls to be back on screen.
  if (action === 'prevStep') {
    muteDialogs();
    try {
      const prevButtons = () => [...document.querySelectorAll(BUTTONS)]
        .filter(b => shown(b) && (/\bmovePrev\b/.test(b.className || '') || /^previous\b/i.test(labelOf(b))) && labelOf(b).length <= 14
          && !b.closest('.ui-datepicker, .datepicker, .flatpickr-calendar'));
      let btn = null;
      const waitUntil = Date.now() + 8000;
      while (Date.now() < waitUntil) {
        const ready = prevButtons().find(enabled);
        if (ready) { btn = ready; break; }
        await pause(300);
      }
      if (!btn) return { clicked: false, back: false, err: 'no enabled Previous button was found' };
      btn.scrollIntoView({ block: 'center' });
      await pause(300);
      btn.click();
      const stepOpen = () => [...document.querySelectorAll('input, select, textarea')].some(c => inPanel(c) && shown(c));
      const until = Date.now() + 15000;
      while (Date.now() < until) {
        await pause(300);
        if (stepOpen()) { await pause(800); return { clicked: true, back: true }; }
      }
      return { clicked: true, back: false, err: 'the Appointment step did not come back' };
    } finally { restoreDialogs(); }
  }
  return { err: 'unknown action ' + action };
}

// ADT-1 "Attachments" step: hand the chosen PDFs to MCA's own upload boxes and press each box's Upload
// button, the way a person does with Choose File. Serialized into the page by executeScript (MAIN world):
// must be self-contained. Never clicks Save, Next or Submit.
//   'probe'  -> { open, found }   is the Attachments step on screen
//   'attach' -> { ok, note|err }  opts.slot = 'intimation' | 'consent' | 'optional', opts.file = {name,type,b64}
async function pageAttach(action, opts) {
  opts = opts || {};
  const pause = ms => new Promise(res => setTimeout(res, ms));
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const rendered = el => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  const SLOTS = {
    intimation: { frag: 'fileuploadwithplaceh_913864895', label: /copy of the intimation sent by company/i },
    consent: { frag: 'fileuploadwithplaceh_422835622', label: /copy of written consent given by auditor/i },
    optional: { frag: 'customfileupload_cop', label: /optional attachment/i }
  };
  const textOf = e => clean(e.tagName === 'INPUT' ? (e.value || '') : e.textContent);
  const ctl = el => el.closest('button, input[type="button"], input[type="submit"], a, [role="button"]') || el;
  const dis = el => {
    const c = ctl(el);
    return !!(c.disabled || c.getAttribute('aria-disabled') === 'true' || /\bdisabled\b/i.test(c.className || '') || /\bdisabled\b/i.test(el.className || ''));
  };
  const buttons = root => [...root.querySelectorAll('button, input[type="button"], input[type="submit"], a, [role="button"], div, span')]
    .filter(b => { const t = textOf(b); return t && t.length <= 14 && (b.children.length === 0 || b.tagName === 'INPUT'); });
  const inputFor = key => {
    const s = SLOTS[key];
    if (!s) return null;
    const all = [...document.querySelectorAll('input[type="file"]')];
    const byName = all.find(i => (i.name || '').includes(s.frag) || (i.id || '').includes(s.frag));
    if (byName) return byName;
    const lab = [...document.querySelectorAll('label, span, div, p')]
      .find(e => rendered(e) && e.children.length <= 2 && clean(e.textContent).length < 120 && s.label.test(clean(e.textContent)));
    if (lab) { let c = lab; for (let i = 0; i < 6 && c; i++, c = c.parentElement) { const f = c.querySelector('input[type="file"]'); if (f) return f; } }
    return null;
  };
  const widgetOf = input => {
    let c = input.parentElement;
    for (let i = 0; i < 10 && c; i++, c = c.parentElement) if (buttons(c).some(b => /^upload$/i.test(textOf(b)))) return c;
    return null;
  };

  if (action === 'probe') {
    const found = {}; let open = false;
    for (const k of Object.keys(SLOTS)) {
      const i = inputFor(k); found[k] = !!i;
      if (i) { const w = widgetOf(i); if (w && rendered(w)) open = true; }
    }
    return { open, found };
  }

  if (action === 'attach') {
    const slot = opts.slot, file = opts.file;
    const input = inputFor(slot);
    if (!input) return { ok: false, err: 'the upload box was not found on the page' };
    const w = widgetOf(input);
    if (!w) return { ok: false, err: 'the Upload button of this box was not found' };
    try { w.scrollIntoView({ block: 'center' }); } catch (_) { }
    const nameBox = () => [...w.querySelectorAll('input[type="text"]')].find(i => i.readOnly || /mb/i.test(i.placeholder || '')) || null;
    const upBtn = () => buttons(w).find(b => /^upload$/i.test(textOf(b)));
    const rmBtn = () => buttons(w).find(b => /^remove$/i.test(textOf(b)));
    try {
      const bin = atob(file.b64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const f = new File([bytes], file.name, { type: file.type || 'application/pdf', lastModified: Date.now() });
      const dt = new DataTransfer(); dt.items.add(f);
      input.files = dt.files;
    } catch (e) { return { ok: false, err: 'the file could not be handed to the page: ' + (e && e.message || e) }; }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // MCA shows the file name and switches the Upload button on once it has taken the file.
    const readyUntil = Date.now() + 8000;
    while (Date.now() < readyUntil) {
      const nb = nameBox(), ub = upBtn();
      if (nb && clean(nb.value) && ub && !dis(ub)) break;
      await pause(300);
    }
    const named = !!(nameBox() && clean(nameBox().value));
    const ub = upBtn();
    if (!ub) return { ok: false, err: 'the Upload button disappeared' };
    ctl(ub).click();

    const dialogText = () => [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode')]
      .filter(rendered).map(e => clean(e.innerText)).filter(t => t && t.length <= 300)[0] || '';
    // The popup watcher may press OK on a popup before it is read here: its log keeps what it closed.
    const popStart = (window.__g8Popups || []).length;
    const closedByWatcher = () => (window.__g8Popups || []).slice(popStart).map(p => p && p.text).filter(Boolean).join(' | ');
    const pressOk = () => {
      for (const d of [...document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .ui-dialog, .swal2-popup, .guideDialogNode')].filter(rendered)) {
        const ok = [...d.querySelectorAll('button, input[type="button"], a, [role="button"]')].find(b => rendered(b) && /^(ok|okay|close)$/i.test(textOf(b)));
        if (ok) { ok.click(); return true; }
      }
      return false;
    };
    const t0 = Date.now(); let verdict = '', dlg = '', soft = false;
    while (Date.now() - t0 < 30000) {
      await pause(400);
      dlg = dialogText() || closedByWatcher();
      if (dlg && /(size|exceed|special|invalid|not allowed|error|fail|unable|only pdf|extension|duplicate)/i.test(dlg) && !/success/i.test(dlg)) { verdict = 'refused'; break; }
      const rm = rmBtn(), up2 = upBtn();
      if ((dlg && /success|uploaded/i.test(dlg)) || (rm && !dis(rm) && up2 && dis(up2))) { verdict = 'uploaded'; break; }
      if (Date.now() - t0 > 10000 && rm && !dis(rm)) { verdict = 'uploaded'; soft = true; break; }
    }
    const shown = nameBox() ? clean(nameBox().value) : '';
    if (verdict === 'uploaded' && dialogText()) { pressOk(); await pause(500); }   // the "uploaded" popup: OK, like a person
    if (verdict === 'uploaded') return { ok: true, note: (shown ? 'uploaded as ' + shown : 'uploaded') + (soft ? ' (MCA showed no confirmation: check the page)' : '') };
    if (verdict === 'refused') return { ok: false, err: 'MCA said: ' + dlg };
    return { ok: false, err: 'no confirmation from MCA after 30 s' + (named ? ' (the file name is in the box: check the page)' : ' (the file name never appeared in the box)') };
  }
  return { err: 'unknown action ' + action };
}

(function (root) {
  "use strict";

  const CIN_RE = /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  const LOOKUP_TIMEOUT_MS = 30000;

  const withTimeoutMs = (promise, ms, msg) => Promise.race([
    promise, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))
  ]);
  const inject = (tabId, func, args, ms) => withTimeoutMs(
    chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args }),
    ms, 'The MCA page stopped responding. Reload the form and try again.'
  ).then(r => r && r[0] && r[0].result);

  // Selectors for the Company Information boxes, straight from the ADT-1 field map.
  function selectors() {
    const byKey = {};
    for (const f of (root.ADT1_FIELDS || [])) byKey[f.dataKey] = f.selector;
    return { cin: byKey.cin, name: byKey.companyName, address: byKey.companyAddress, email: byKey.companyEmail };
  }

  function friendly(e) {
    const m = String((e && e.message) || e);
    if (/no tab with id|tab was closed/i.test(m)) return 'The MCA tab was closed. Reopen Form ADT-1 on mca.gov.in and try again.';
    if (/cannot access (contents of|a chrome)|missing host permission|cannot be scripted/i.test(m)) return 'The active tab is not the MCA ADT-1 form. Open it on mca.gov.in and try again.';
    return m;
  }

  // onStep(text): progress text for the "Fill company info" timeline step.
  async function run(tabId, data, onStep) {
    const step = text => { if (typeof onStep === 'function') onStep(text); };
    const fail = (failedStep, message) => ({ ok: false, failedStep, message });
    try {
      const cin = String((data && (data.cin || data.CIN)) || '').trim().toUpperCase();
      if (!cin) return fail('cin', 'No CIN in the data. Add {"cin": "..."} and try again.');
      if (!CIN_RE.test(cin)) return fail('cin', 'CIN "' + cin + '" is not a valid 21-character CIN (for example U12345MH2020PTC123456).');
      const sel = selectors();

      step('Finding the CIN box');
      const located = await inject(tabId, pageAdt1, ['locate', { sel }], 10000);
      if (!located || !located.found.cin) return fail('cin', 'The CIN box was not found. Open Form ADT-1 on the "Company Information" step first.');
      if (!located.found.name) return fail('cin', 'The "Name of the company" box was not found, so the autofill cannot be confirmed.');

      const mcaSaid = [];
      const fillCin = async typeChars => {
        const job = { id: 'CIN', kind: 'text', selector: '[data-g8-adt1="cin"]', index: 0, value: cin, typeChars };
        const out = await inject(tabId, pageFill, [[job]], 60000);
        // pageFill mutes MCA's native alerts while it runs; keep what they said for the report.
        for (const d of ((out && out.dialogs) || [])) if (d && d.msg && d.type !== 'page-success') mcaSaid.push(String(d.msg));
        const r = ((out && out.results) || []).find(x => x.id === 'CIN');
        return r && r.ok ? null : 'Could not enter the CIN' + (r && r.err ? ' (' + r.err + ')' : '') + '.';
      };
      const waitForCompany = timeout => inject(tabId, pageAdt1, ['status', { sel, timeout }], timeout + 30000)
        .then(s => {
          mcaSaid.push(...((s && s.dialogs) || []));
          if (s && s.cinError) mcaSaid.push(s.cinError);
          return (s && s.state) || {};
        });
      const mcaNote = () => mcaSaid.length ? ' MCA said: ' + [...new Set(mcaSaid)].join(' | ') : '';

      let st;
      if (located.cinValue.toUpperCase() === cin && located.nameFilled) {
        step('CIN already loaded, checking the company details');
        st = await waitForCompany(5000);
      } else {
        step('Entering ' + cin);
        let err = await fillCin(false);
        if (err) return fail('cin', err);
        step('Waiting for MCA to fill the company details');
        st = await waitForCompany(10000);
        if (!st.name || !st.name.filled) {
          // A plain write did not start MCA's lookup: type it key by key like a person would.
          step('Typing the CIN key by key');
          await inject(tabId, pageAdt1, ['clearCin', { sel }], 10000);
          err = await fillCin(true);
          if (err) return fail('cin', err);
          step('Waiting for MCA to fill the company details');
          st = await waitForCompany(LOOKUP_TIMEOUT_MS);
        }
      }
      if (!st.name || !st.name.filled) return fail('cin', 'MCA did not load the company details within ' + LOOKUP_TIMEOUT_MS / 1000 + 's. Check that the CIN is right.' + mcaNote());
      const empty = ['address', 'email'].filter(k => st[k] && st[k].found && !st[k].filled);
      if (empty.length) return fail('cin', 'MCA has not filled: ' + empty.join(', ') + '. Next was not clicked.' + mcaNote());

      step('Clicking Next');
      const next = await inject(tabId, pageAdt1, ['next', { sel }], 60000);
      if (!next || !next.clicked) return fail('next', 'Could not click Next: ' + ((next && next.err) || 'no response') + '.');
      if (!next.advanced) {
        const why = next.errors && next.errors.length ? ' MCA shows: ' + next.errors.join(' | ') : (next.dialogs && next.dialogs.length ? ' MCA said: ' + next.dialogs.join(' | ') : '');
        return { ok: false, failedStep: 'next', clicked: true, message: 'Next was clicked but the form is still on Company Information.' + why };
      }
      return { ok: true, failedStep: null, message: 'CIN filled, MCA autofilled the company details, and Next was clicked.' };
    } catch (e) {
      return fail('cin', friendly(e));
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Phase 2: "Appointment and Auditor Details". Fills the mapped appointment / auditor fields, lists
  // what is still unanswered, clicks THIS step's Save and stops (Next is never clicked). The
  // Declaration fields (resolution, signatory) belong to a later phase and are not touched.
  // UNVERIFIED AGAINST THE LIVE MCA PAGE (the session expired): built from the field-map selectors and
  // the facts recorded from the live page, and exercised only against a local mock.
  // ---------------------------------------------------------------------------------------------
  const APPT_MARKER = 'panel_710365359-panel_8730171-';
  const APPT_CATEGORIES = ['appointment', 'auditorFirm', 'auditorIndividual', 'priorAppointments', 'tribunal', 'casualVacancy'];
  // PIN code fields trigger MCA's postal lookup that fills area/city/district/state.
  // MCA fills city/district/state only after an Area/Locality has been CHOSEN (seen on the live page),
  // so the area is picked right after the PIN: from the data, or else the first locality MCA lists.
  const PIN_GROUPS = {
    firmPin: { area: 'firmArea', areaLabel: 'Firm area', city: 'firmCity', dependents: ['firmArea', 'firmCity', 'firmDistrict', 'firmState'] },
    auditorPin: { area: 'auditorArea', areaLabel: 'Auditor area', city: 'auditorCity', dependents: ['auditorArea', 'auditorCity', 'auditorDistrict', 'auditorState'] }
  };
  const compact = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const present = v => v !== undefined && v !== null && String(v).trim() !== '';
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // The four bare Yes/No(/Not Applicable) questions of the Appointment step. They have no entry in
  // field-maps/adt1.js because their radios are only "Yes"/"No": the question text sits in the field
  // box around them, so they are found by that text. `pattern` is a regex source tested against the
  // lower-cased, punctuation-free question text (wording from the live page). A question is answered
  // only when the data holds a value for its key; nothing is ever defaulted.
  const QUESTIONS = [
    { key: 'classUnder139_2', label: '3(a) Whether the company falls under a class of companies as per section 139(2)',
      pattern: 'class of compan(?:y|ies) as per section 139' },
    { key: 'appointedInAgm', label: '3(c) Whether the auditor(s) was appointed in the annual general meeting (AGM)',
      pattern: 'whether auditor(?: s)? (?:has|have) been appointed in the (?:annual general meeting|agm)' },
    { key: 'within20CompaniesLimit', label: '4(k) Whether the appointment is within the limit of twenty companies (section 141(3)(g))',
      pattern: 'within the limits of twenty compan' },
    { key: 'previouslyAudited', label: '4(l) Whether the auditor, firm or a member previously audited this company',
      pattern: 'previously conducted audit', optional: true },
    { key: 'auditCommitteeRecommendation', label: '5 Whether the Audit Committee recommendation (section 177) was considered by the Board',
      pattern: 'recommendation of the audit committee', allowNA: true }
  ];
  // true/false/"Yes"/"No"/"Y"/"N"/"Not Applicable"/"NA" (any case) -> 'yes' | 'no' | 'na' | null
  function parseYesNo(v) {
    const s = compact(v);
    if (s === 'yes' || s === 'y' || s === 'true') return 'yes';
    if (s === 'no' || s === 'n' || s === 'false') return 'no';
    if (s === 'notapplicable' || s === 'na') return 'na';
    return null;
  }
  const normQ = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // Dates go in as DD/MM/YYYY; accept an ISO date too and convert it.
  function toDMY(v) {
    const s = String(v).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : null;
  }

  // Which wizard step is open on the page: 'company', 'appointment', or null (something else).
  async function detectStep(tabId) {
    try {
      const r = await inject(tabId, pageAdt1, ['step', { sel: selectors(), marker: APPT_MARKER }], 15000);
      if (!r) return { step: null, company: false, appointment: false, error: 'The MCA page did not answer.' };
      return { step: r.company ? 'company' : r.appointment ? 'appointment' : null, company: !!r.company, appointment: !!r.appointment };
    } catch (e) {
      return { step: null, company: false, appointment: false, error: friendly(e) };
    }
  }

  // onStep(text): progress text for the timeline. Never throws: failures come back in the result.
  async function runAppointment(tabId, data, onStep, runOpts) {
    const step = text => { if (typeof onStep === 'function') onStep(text); };
    const filled = [], failed = [], rows = [], mcaMessages = [], needsManual = [];
    const autoChosen = [];   // choices made without a value in the data ("Firm area: Cottonpet"): to be checked by the person
    const out = (ok, failedStep, message, extra) => Object.assign({
      ok, failedStep, message, filled, failed, needsManual, autoChosen, saved: false, mcaMessages: [...new Set(mcaMessages)],
      fields: rows, summary: summarize()
    }, extra || {});
    const summarize = () => ({
      filled: rows.filter(r => r.status === 'filled').length,
      skipped: rows.filter(r => r.status === 'skipped').length,
      invalid: rows.filter(r => r.status === 'invalid').length,
      empty: 0, needsReview: rows.filter(r => r.status === 'needs-review').length
    });
    const note = (f, status, reason) => rows.push({ dataKey: f.dataKey, label: f.label, status, reason: reason || undefined });
    const markFailed = (f, reason) => { failed.push({ key: f.dataKey, reason }); note(f, 'invalid', reason); };
    try {
      data = data || {};
      const fields = (root.ADT1_FIELDS || []).filter(f => APPT_CATEGORIES.includes(f.category));
      if (!fields.length) return out(false, 'fill', 'The ADT-1 field map is not loaded.');
      if (!fields.some(f => present(data[f.dataKey]))) {
        return out(false, 'fill', 'The data has no appointment or auditor values to fill (for example natureOfAppointment, dateOfAppointment, auditorCategory, firmName, auditorName).');
      }

      step('Checking which ADT-1 step is open');
      const where = await detectStep(tabId);
      if (where.error) return out(false, 'fill', where.error);
      if (where.step !== 'appointment') {
        return out(false, 'fill', where.step === 'company'
          ? 'The form is still on Company Information. Run Fill ADT-1 there first (it enters the CIN and clicks Next), then run it again on "Appointment and Auditor Details".'
          : 'The "Appointment and Auditor Details" step is not open. Open Form ADT-1 on that step and try again.');
      }

      const byKey = {};
      for (const f of fields) byKey[f.dataKey] = f;
      const peek = async (list, wait, waitOptions) => {
        const r = await inject(tabId, pageAdt1, ['peek', { items: list.map(f => ({ key: f.dataKey, selector: f.selector })), wait, waitOptions: !!waitOptions }], (wait || 0) + 20000);
        return (r && r.state) || {};
      };
      // One pageFill job, retried once like the main loop does (not for "not found" answers).
      const fillOne = async job => {
        const once = async () => {
          const res = await inject(tabId, pageFill, [[job]], 120000);
          for (const d of ((res && res.dialogs) || [])) if (d && d.msg && d.type !== 'page-success') mcaMessages.push(String(d.msg));
          return ((res && res.results) || []).find(x => x.id === job.id) || { ok: false, err: 'no answer from the page' };
        };
        let r = await once();
        if (!r.ok && !/not in (group|list)|group not found|not found/i.test(r.err || '')) { await sleep(700); r = await once(); }
        return r;
      };
      const settle = (quiet, max) => inject(tabId, pageAdt1, ['settle', { quiet, max }], max + 25000);

      // The conditional groups depend on the nature / category answers. Use the data, and where the
      // data is silent, whatever is already ticked on the page.
      const pageAnswer = async key => {
        try { const s = (await peek([byKey[key]], 0))[key]; return (s && s.checked) || []; } catch (_) { return []; }
      };
      const natureTexts = present(data.natureOfAppointment) ? [String(data.natureOfAppointment)] : await pageAnswer('natureOfAppointment');
      const categoryTexts = present(data.auditorCategory) ? [String(data.auditorCategory)] : await pageAnswer('auditorCategory');
      const anyText = (arr, re) => arr.some(t => re.test(t));
      const isTribunal = anyText(natureTexts, /tribunal/i);
      const isCasual = anyText(natureTexts, /casual vacancy|non-?\s*re-?\s*appointment/i);
      const isOthers = natureTexts.some(t => compact(t) === 'others');
      const isFirm = anyText(categoryTexts, /firm/i);
      const casualOthers = present(data.casualVacancyReason) && /^others/i.test(String(data.casualVacancyReason).trim());
      const condition = f => {
        switch (f.category) {
          case 'auditorFirm': return isFirm ? '' : (categoryTexts.length ? 'only for Category of Auditor = "Auditor\'s Firm"' : 'auditorCategory is not set, so the firm section was not filled');
          case 'tribunal': return isTribunal ? '' : 'only for Nature of appointment = appointed by the Tribunal';
          case 'casualVacancy':
            if (!isCasual) return 'only for the casual-vacancy / non-re-appointment natures of appointment';
            if (f.dataKey === 'casualVacancyOtherReason' && !casualOthers) return 'only when the casual-vacancy reason is Others';
            return '';
          case 'priorAppointments': return present(data.numPriorFinancialYears) || f.dataKey === 'numPriorFinancialYears' ? '' : 'numPriorFinancialYears is empty';
          default:
            if (f.dataKey === 'natureOfAppointmentOther' && !isOthers) return 'only when Nature of appointment = Others';
            return '';
        }
      };

      const handOffs = [];       // things the person must do on MCA, collected before the final scan
      const handOff = label => { if (!handOffs.includes(label)) handOffs.push(label); };
      const pinFilled = {};      // pin key -> true once that PIN was entered
      const verifyJobs = [];     // plain jobs for the post-fill check
      let budget = 2500;         // how long to wait for a field to appear (shrinks once a wait times out)
      let n = 0;
      const notShown = [];   // values that had no visible box on MCA: reported, never silently dropped
      const retryFields = [];   // the same fields, tried again once the questions are answered (MCA reveals boxes late)
      const total = fields.filter(f => present(data[f.dataKey])).length + QUESTIONS.filter(q => present(data[q.key])).length;

      // After a PIN code MCA lists the localities but leaves Area/Locality on "Select Here", and fills
      // city/district/state only once an area is CHOSEN. When the data names no area, take the first
      // real locality MCA offers, and flag it for the person to check.
      const autoPickArea = async (pinKey, forcedWhy) => {
        const g = PIN_GROUPS[pinKey], af = byKey[g.area];
        if (!af || (present(data[g.area]) && !forcedWhy)) return;     // the data names the area: the normal field flow fills it
        try {
          step('Choosing the area MCA lists for the PIN code');
          const pk = (await peek([af], 3000, true))[af.dataKey] || {};
          if (pk.rendered && pk.tag === 'SELECT' && pk.empty && !pk.disabled && !(pk.optionTexts || []).length) {
            rows.push({ dataKey: af.dataKey, label: af.label, status: 'needs-review', reason: 'MCA listed no locality for this PIN code (its lookup returned nothing): pick Area/Locality by hand' });
            handOff(af.label + ' (MCA listed no locality for PIN ' + String(data[pinKey] || '') + ': type the PIN again on the page, press Tab, then pick the area)');
            return;
          }
          if (!pk.rendered || pk.tag !== 'SELECT' || !pk.empty || pk.disabled || !(pk.optionTexts || []).length) return;
          // The locality whose name shares the most words with the address lines wins; none -> the first one.
          const addrText = (pinKey === 'firmPin' ? ['firmAddr1', 'firmAddr2'] : ['auditorAddr1', 'auditorAddr2']).map(k => String(data[k] || '')).join(' ');
          const STOP = new Set(['road', 'street', 'main', 'cross', 'near', 'opposite', 'floor', 'flat', 'shop', 'plot', 'house', 'building', 'block', 'layout', 'india', 'post', 'office']);
          const aw = [...new Set(normQ(addrText).split(' ').filter(w => w.length >= 4 && !STOP.has(w)))];
          let pick = pk.optionTexts[0], how = 'it is the first locality MCA listed', best = 0;
          for (const o of pk.optionTexts) {
            const on = ' ' + normQ(o) + ' ';
            const hits = aw.filter(w => on.includes(' ' + w + ' '));
            if (hits.length > best) { best = hits.length; pick = o; how = 'its name matches your address ("' + hits.join('", "') + '")'; }
          }
          if (forcedWhy) how = forcedWhy + '; chose it because ' + how;
          const r = await fillOne({ id: af.dataKey, kind: 'text', selector: af.selector, index: 0, value: pick });
          if (r.ok && !r.hidden) {
            filled.push(af.dataKey);
            autoChosen.push(g.areaLabel + ': ' + pick + ' (' + how + ')');
            rows.push({ dataKey: af.dataKey, label: af.label, status: 'needs-review', reason: 'chosen automatically (' + how + '): check it', value: pick });
            step('Waiting for MCA to fill city, district and state');
            await settle(1500, 8000);
          } else {
            rows.push({ dataKey: af.dataKey, label: af.label, status: 'needs-review', reason: 'could not choose a locality automatically' + (r.err ? ' (' + r.err + ')' : '') + ': pick it by hand' });
          }
        } catch (e) {
          rows.push({ dataKey: af.dataKey, label: af.label, status: 'needs-review', reason: 'could not choose a locality automatically (' + friendly(e) + '): pick it by hand' });
        }
      };

      // After the PIN code MCA must list the localities. If the list stays empty, type the PIN again
      // (real key events) and touch the Area box, up to twice, before giving up with a clear message.
      const ensureAreaList = async (pinKey, pinJob) => {
        const g = PIN_GROUPS[pinKey], af = byKey[g.area];
        if (!af) return;
        const listed = async ms => { const pk = (await peek([af], ms, true))[af.dataKey] || {}; return pk.rendered && (pk.optionTexts || []).length ? pk : null; };
        let pk = await listed(3000);
        // pinTab already tried typing + Tab, the form model and touching the Area box; one more go is
        // enough. Once a lookup proved dead for one PIN, do not spend the same time again on the other.
        if (!pk && !lookupDead) {
          step('MCA has not listed the localities yet: asking once more');
          await inject(tabId, pageAdt1, ['pinTab', { pinSelector: pinJob.pinSelector || pinJob.selector, areaSelector: af.selector, value: pinJob.value, wait: 5000, quick: true }], 60000);
          await settle(1500, 4000);
          pk = await listed(4000);
        }
        if (!pk) lookupDead = true;
        return !!pk;
      };
      let lookupDead = false;   // MCA's locality lookup returned nothing for a PIN on this page

      for (const f of fields) {
        const raw = data[f.dataKey];
        if (!present(raw)) continue;
        if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) return out(false, 'fill', 'Stopped by you before the Appointment step was saved.');
        n++;
        const why = condition(f);
        if (why) { note(f, 'skipped', why); continue; }
        step('Filling ' + f.label + ' (' + n + '/' + total + ')');
        try {
          let value = String(raw).trim();
          if (f.type === 'date') {
            const d = toDMY(value);
            if (!d) { markFailed(f, 'date "' + value + '" is not DD/MM/YYYY'); continue; }
            value = d;
          }
          const pk = (await peek([f], budget))[f.dataKey] || { rendered: false };
          if (!pk.rendered) {
            budget = 500;
            note(f, 'skipped', pk.found ? 'not shown on the page' : 'not found on the page');
            notShown.push(f.label);
            if (f.type !== 'radio' && !PIN_GROUPS[f.dataKey] && !Object.keys(PIN_GROUPS).some(k => PIN_GROUPS[k].dependents.includes(f.dataKey))) retryFields.push(f);
            continue;
          }
          // Where a PIN lookup already filled the area/city/district/state, keep MCA's values.
          const pinGroup = Object.keys(PIN_GROUPS).find(k => PIN_GROUPS[k].dependents.includes(f.dataKey));
          if (pinGroup && pinFilled[pinGroup] && !pk.empty) { note(f, 'skipped', 'MCA filled it from the PIN code ("' + pk.value + '")'); filled.push(f.dataKey); continue; }
          if (pinGroup && PIN_GROUPS[pinGroup].area === f.dataKey && pk.tag === 'SELECT') {
            const texts = pk.optionTexts || [];
            if (!texts.length) { markFailed(f, 'MCA did not list any locality for the PIN code (its lookup returned nothing), so "' + value + '" could not be chosen: pick Area/Locality by hand'); handOff(f.label + ' (MCA listed no locality: type the PIN again on the page, press Tab, then pick "' + value + '")'); continue; }
            const wantC = compact(value);
            if (!texts.some(o => compact(o) === wantC || compact(o).includes(wantC) || wantC.includes(compact(o)))) {
              await autoPickArea(pinGroup, 'your area "' + value + '" is not in MCA\'s list');
              continue;
            }
          }

          const job = { id: f.dataKey, kind: f.type === 'radio' ? 'radio' : f.type === 'date' ? 'date' : 'text', selector: f.selector, index: 0, value };
          if (f.type === 'radio') {
            // Take the page's own spelling of the option; refuse to guess when none matches exactly.
            let hit = null;
            for (const texts of (pk.options || [])) { hit = texts.find(t => compact(t) === compact(value)); if (hit) break; }
            if (!hit) {
              // No exact match: accept the ONE option that contains every significant word of the wanted text.
              const words = s => normQ(s).replace(/\bre appoint/g, 'reappoint').split(' ').filter(w => w.length > 2 && !['the', 'and', 'for', 'any'].includes(w));
              const want = words(value);
              const cands = [];
              for (const texts of (pk.options || [])) { const t = texts.find(x => want.length && want.every(w => words(x).includes(w))); if (t) cands.push(t); }
              if (cands.length === 1) hit = cands[0];
            }
            if (!hit) { markFailed(f, 'option "' + value + '" not found; the page offers: ' + (pk.options || []).map(t => t[0]).join(' | ')); continue; }
            job.value = hit;
            // The map's waitForSelector is the field that "Auditor's Firm" reveals; waiting for it
            // after choosing "Individual" would only time out and report a false failure.
            if (f.waitForSelector && (f.dataKey !== 'auditorCategory' || /firm/i.test(hit))) job.waitForSelector = f.waitForSelector;
          }
          let runJob = job;
          if (PIN_GROUPS[f.dataKey]) {
            runJob = Object.assign({}, job, { kind: 'pinCode', pinSelector: f.selector, areaSelector: byKey[PIN_GROUPS[f.dataKey].area].selector, citySelector: byKey[PIN_GROUPS[f.dataKey].city].selector });
          }

          const attempt = async () => {
            if (PIN_GROUPS[f.dataKey]) {
              const pr = await inject(tabId, pageAdt1, ['pinTab', { pinSelector: f.selector, areaSelector: byKey[PIN_GROUPS[f.dataKey].area].selector, value, wait: 8000 }], 60000);
              if (!pr) return { ok: false, err: 'no answer from the page' };
              if (pr.ok && !pr.hidden) pr.note = pr.options ? 'MCA listed ' + pr.options + ' localit' + (pr.options === 1 ? 'y' : 'ies') + ' (' + pr.how + ')' : 'PIN entered, but MCA listed no locality yet';
              return pr;
            }
            const res = await inject(tabId, pageFill, [[runJob]], 120000);
            for (const d of ((res && res.dialogs) || [])) if (d && d.msg && d.type !== 'page-success') mcaMessages.push(String(d.msg));
            return ((res && res.results) || []).find(x => x.id === f.dataKey) || { ok: false, err: 'no answer from the page' };
          };
          let r = await attempt();
          if (!r.ok && !/not in (group|list)|group not found|not found/i.test(r.err || '')) { await new Promise(res => setTimeout(res, 700)); r = await attempt(); }

          if (r.hidden) {
            const locked = /locked by MCA/i.test(r.note || '');
            note(f, 'skipped', locked ? 'MCA fills this itself (the box is locked)' : (r.note || 'not shown on the page'));
            if (!locked) notShown.push(f.label);
            continue;
          }
          if (!r.ok) { markFailed(f, r.err || 'could not fill'); continue; }
          filled.push(f.dataKey);
          note(f, 'filled', r.note && r.note !== 'already selected' ? r.note : undefined);
          // Selects are checked by pageFill itself (its option match is looser than pageVerify's).
          if (f.type !== 'select') verifyJobs.push(job);
          // A radio answer, or the number of prior years, reveals more fields a moment later.
          if ((f.type === 'radio' && r.note !== 'already selected') || f.dataKey === 'numPriorFinancialYears') budget = 3500;
          if (PIN_GROUPS[f.dataKey]) {
            pinFilled[f.dataKey] = true;
            step('Waiting for MCA\'s PIN code lookup');
            await settle(1500, 8000);
            await ensureAreaList(f.dataKey, runJob);
            await autoPickArea(f.dataKey);
          } else if (pinGroup && PIN_GROUPS[pinGroup].area === f.dataKey) {
            // The area was chosen from the data: MCA now fills city, district and state.
            step('Waiting for MCA to fill city, district and state');
            await settle(1500, 8000);
          }
        } catch (e) {
          markFailed(f, friendly(e));
        }
      }

      // Rows 2..N of the previous-tenure table. Row 1 comes from the field map; the other rows are
      // taken from data.priorRows (an array of {firmReg, membership, fyStart, fyEnd}), or, when only
      // row 1 is given for a tenure of N years, derived as the N consecutive financial years that
      // follow row 1 with the same firm and auditor, and flagged for checking.
      const fillTenureRows = async () => { try {
        for (let i = rows.length - 1; i >= 0; i--) if (/^priorRow[2-9]/.test(rows[i].dataKey || '')) rows.splice(i, 1);
        for (let i = failed.length - 1; i >= 0; i--) if (/^priorRow[2-9]/.test(failed[i].key || '')) failed.splice(i, 1);
        for (let i = autoChosen.length - 1; i >= 0; i--) if (/^Previous-tenure rows/.test(autoChosen[i])) autoChosen.splice(i, 1);
        const nYears = parseInt(String(data.numPriorFinancialYears || ''), 10) || 0;
        const given = Array.isArray(data.priorRows) ? data.priorRows.filter(r => r && typeof r === 'object') : [];
        const addYear = d => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(toDMY(d) || ''); return m ? m[1] + '/' + m[2] + '/' + (parseInt(m[3], 10) + 1) : ''; };
        const wantRows = [];
        const row1 = given[0] || {};
        const r1Start = present(data.priorRow1FyStart) ? data.priorRow1FyStart : row1.fyStart, r1End = present(data.priorRow1FyEnd) ? data.priorRow1FyEnd : row1.fyEnd;
        if (nYears > 1 && present(r1Start) && present(r1End)) {
          let fs0 = toDMY(r1Start), fe0 = toDMY(r1End);
          for (let i = 1; i < nYears; i++) {
            const g = given[i] || {};
            fs0 = addYear(fs0); fe0 = addYear(fe0);
            wantRows.push({
              firmReg: present(g.firmReg) ? String(g.firmReg) : String(data.priorRow1FirmReg || row1.firmReg || ''),
              membership: present(g.membership) ? String(g.membership) : String(data.priorRow1Membership || row1.membership || ''),
              fyStart: present(g.fyStart) ? (toDMY(g.fyStart) || '') : fs0,
              fyEnd: present(g.fyEnd) ? (toDMY(g.fyEnd) || '') : fe0,
              derived: !(present(g.fyStart) && present(g.fyEnd))
            });
          }
        }
        if (nYears >= 1) {
          step('Filling the previous-tenure table (' + nYears + ' year' + (nYears === 1 ? '' : 's') + ')');
          // 4(n) itself can be repainted empty by MCA: put it back before looking for the rows.
          try {
            const nf = byKey.numPriorFinancialYears;
            if (nf && present(data.numPriorFinancialYears)) {
              const pkn = (await peek([nf], 0)).numPriorFinancialYears || {};
              if (pkn.rendered && pkn.empty) {
                const rn = await fillOne({ id: 'numPriorFinancialYears', kind: 'text', selector: nf.selector, index: 0, value: String(data.numPriorFinancialYears).trim() });
                if (rn.ok && !rn.hidden) { if (!filled.includes('numPriorFinancialYears')) filled.push('numPriorFinancialYears'); await settle(1500, 6000); }
              }
            }
          } catch (_) { }
          // MCA builds one row per year a little after 4(n) is set: keep looking for up to ~25 s.
          let found = null, rowsOnPage = [];
          const rowsUntil = Date.now() + 25000;
          for (;;) {
            found = await inject(tabId, pageAdt1, ['priorRows', { marker: APPT_MARKER }], 30000);
            rowsOnPage = (found && found.rows) || [];
            if (rowsOnPage.length >= nYears || Date.now() > rowsUntil) break;
            step('Waiting for MCA to show the ' + nYears + ' previous-tenure rows (' + rowsOnPage.length + ' so far)');
            await settle(800, 2500);
          }
          // Row 1 too, when the table only appeared after its own turn had passed.
          if (rowsOnPage[0]) {
            const r1 = rowsOnPage[0];
            for (const [prop, key, kind] of [['firmReg', 'priorRow1FirmReg', 'text'], ['membership', 'priorRow1Membership', 'text'], ['fyStart', 'priorRow1FyStart', 'date'], ['fyEnd', 'priorRow1FyEnd', 'date']]) {
              const fld = byKey[key];
              if (!fld || !present(data[key]) || !r1[prop]) continue;
              const val = kind === 'date' ? (toDMY(data[key]) || '') : String(data[key]).trim();
              if (!val) continue;
              const job = { id: key, kind, selector: 'input[name="' + String(r1[prop]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]', index: 0, value: val };
              const r = await fillOne(job);
              if (r.ok && !r.hidden) {
                for (let i = rows.length - 1; i >= 0; i--) if (rows[i].dataKey === key) rows.splice(i, 1);
                for (let i = failed.length - 1; i >= 0; i--) if (failed[i].key === key) failed.splice(i, 1);
                const ni = notShown.indexOf(fld.label); if (ni >= 0) notShown.splice(ni, 1);
                filled.push(key); note(fld, 'filled', 'filled once MCA showed the table'); verifyJobs.push(job);
              }
            }
          }
          const derivedRows = [];
          for (let i = 0; i < wantRows.length; i++) {
            const rowNo = i + 2, w = wantRows[i], pr = rowsOnPage[i + 1];
            const lab = k => '4(' + k + ') Row ' + rowNo;
            if (!pr) { rows.push({ dataKey: 'priorRow' + rowNo, label: 'Previous tenure row ' + rowNo, status: 'invalid', reason: 'MCA shows no row ' + rowNo + ' (it creates the rows from 4(n)): add it by hand' }); failed.push({ key: 'priorRow' + rowNo, reason: 'row not on the page' }); continue; }
            const cells = [['p', 'firmReg', 'text', w.firmReg], ['q', 'membership', 'text', w.membership], ['r', 'fyStart', 'date', w.fyStart], ['s', 'fyEnd', 'date', w.fyEnd]];
            for (const [k, prop, kind, val] of cells) {
              if (!present(val)) continue;
              if (!pr[prop]) { rows.push({ dataKey: 'priorRow' + rowNo + prop, label: lab(k), status: 'invalid', reason: 'box not found in row ' + rowNo }); failed.push({ key: 'priorRow' + rowNo + prop, reason: 'box not found' }); continue; }
              const job = { id: 'priorRow' + rowNo + prop, kind, selector: 'input[name="' + String(pr[prop]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]', index: 0, value: String(val) };
              const r = await fillOne(job);
              if (r.ok && !r.hidden) { filled.push(job.id); rows.push({ dataKey: job.id, label: lab(k), status: w.derived && kind === 'date' ? 'needs-review' : 'filled', reason: w.derived && kind === 'date' ? 'derived as the next financial year: check it' : undefined }); verifyJobs.push(job); }
              else if (r.hidden) rows.push({ dataKey: job.id, label: lab(k), status: 'skipped', reason: r.note || 'not shown' });
              else { markFailed({ dataKey: job.id, label: lab(k) }, r.err || 'could not fill'); }
            }
            if (w.derived) derivedRows.push(rowNo);
          }
          if (derivedRows.length) autoChosen.push('Previous-tenure rows ' + derivedRows.join(', ') + ' (financial years derived from row 1: ' + wantRows.filter(w => w.derived).map(w => w.fyStart + ' to ' + w.fyEnd).join('; ') + ')');
        }
      } catch (e) { mcaMessages.push('Previous-tenure rows: ' + friendly(e)); } };

      // MCA's lookup can answer late and repaint the Area box after it was chosen: look once more.
      const reaffirmAreas = async () => {
      let areasFixed = 0;
      for (const pinKey of Object.keys(pinFilled)) {
        const g = PIN_GROUPS[pinKey], af = byKey[g.area];
        if (!af) continue;
        try {
          const pk = (await peek([af], 0))[af.dataKey] || {};
          if (!pk.rendered || pk.tag !== 'SELECT' || !pk.empty || !(pk.optionTexts || []).length) continue;
          step('MCA cleared the area after a late lookup: choosing it again');
          const want = present(data[g.area]) ? String(data[g.area]).trim() : '';
          const wantC = compact(want);
          const listedWant = want && pk.optionTexts.some(o => compact(o) === wantC || compact(o).includes(wantC) || wantC.includes(compact(o)));
          if (listedWant) { const r = await fillOne({ id: af.dataKey, kind: 'text', selector: af.selector, index: 0, value: want }); if (r.ok) { areasFixed++; if (!filled.includes(af.dataKey)) filled.push(af.dataKey); } }
          else { await autoPickArea(pinKey, 'MCA cleared the area after a late lookup'); areasFixed++; }
          await settle(1500, 8000);
        } catch (_) { }
      }
      return areasFixed;
      };
      await reaffirmAreas();

      // The bare Yes/No(/Not Applicable) questions, found by their question text. Only answered when the
      // data has a value for them; a question that is missing, matched twice, or lacks the wanted
      // option is reported as failed and never guessed.
      let answeredQuestions = 0;
      // Answer one Yes/No question from the data. Returns true when it is ticked (or already was).
      const answerQuestion = async (q, quiet) => {
        const qf = { dataKey: q.key, label: q.label };
        byKey[q.key] = qf;
        try {
          if (!quiet) step('Answering: ' + q.label + ' (' + n + '/' + total + ')');
          const want = parseYesNo(data[q.key]);
          if (!want) { markFailed(qf, 'the value "' + String(data[q.key]).trim() + '" is not ' + (q.allowNA ? 'Yes, No or Not Applicable' : 'Yes or No')); return false; }
          const found = await inject(tabId, pageAdt1, ['findQuestion', { marker: APPT_MARKER, pattern: q.pattern, flags: 'i', wait: 4000 }], 40000);
          if (q.optional && (!found || found.status === 'none')) { note(qf, 'skipped', 'not shown on MCA for this nature of appointment'); return false; }
          if (!found || found.status === 'none') { markFailed(qf, 'this question was not found on the MCA page (not shown, or MCA words it differently): answer it by hand'); return false; }
          if (found.status === 'ambiguous') { markFailed(qf, found.count + ' questions on the page match this wording, so nothing was ticked: answer it by hand'); return false; }
          if (found.status !== 'found') { markFailed(qf, 'the question was found but its Yes/No boxes cannot be addressed (' + (found.err || found.status) + '): answer it by hand'); return false; }
          const wanted = want === 'na' ? ['notapplicable', 'na'] : [want];
          let hit = null;
          for (const texts of (found.options || [])) { hit = texts.find(t => wanted.includes(compact(t))); if (hit) break; }
          if (!hit) { markFailed(qf, 'the page does not offer that answer; it offers: ' + (found.options || []).map(t => t[0]).join(' | ')); return false; }
          const job = { id: q.key, kind: 'radio', selector: 'input[name="' + String(found.name).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]', index: 0, value: hit };
          const r = await fillOne(job);
          if (r.hidden) { markFailed(qf, r.note || 'the question is not shown or is locked by MCA'); return false; }
          if (!r.ok) { markFailed(qf, r.err || 'could not answer'); return false; }
          if (!filled.includes(q.key)) filled.push(q.key);
          for (let i = rows.length - 1; i >= 0; i--) if (rows[i].dataKey === q.key) rows.splice(i, 1);
          for (let i = failed.length - 1; i >= 0; i--) if (failed[i].key === q.key) failed.splice(i, 1);
          note(qf, 'filled', r.note && r.note !== 'already selected' ? r.note : undefined);
          verifyJobs.push(job);
          answeredQuestions++;
          return true;
        } catch (e) {
          markFailed(qf, friendly(e));
          return false;
        }
      };
      for (const q of QUESTIONS) {
        if (!present(data[q.key])) continue;
        if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) return out(false, 'fill', 'Stopped by you before the Appointment step was saved.');
        n++;
        await answerQuestion(q);
      }
      // An answer can reveal or hide other questions; let MCA finish before the check below.
      if (answeredQuestions) await settle(1000, 4000);

      // Boxes MCA only reveals after other answers (the AGM date after 3(c) = Yes, the number of previous
      // years after 4(l) = Yes, ...): they were not on screen when their turn came. Wait for them and fill them now.
      if (retryFields.length) {
        step('Waiting for boxes MCA reveals after the answers');
        for (const f of retryFields) {
          if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) return out(false, 'fill', 'Stopped by you before the Appointment step was saved.');
          try {
            const pk = (await peek([f], 10000))[f.dataKey] || {};
            if (!pk.rendered) continue;                       // still not there: stays reported as not shown
            let value = String(data[f.dataKey]).trim();
            if (f.type === 'date') { const d = toDMY(value); if (!d) continue; value = d; }
            const job = { id: f.dataKey, kind: f.type === 'date' ? 'date' : 'text', selector: f.selector, index: 0, value };
            const r = await fillOne(job);
            const dropRow = () => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].dataKey === f.dataKey && rows[i].status === 'skipped') rows.splice(i, 1); const ni = notShown.indexOf(f.label); if (ni >= 0) notShown.splice(ni, 1); };
            if (r.hidden) { dropRow(); note(f, 'skipped', 'MCA fills this itself (the box is locked)'); }
            else if (r.ok) { dropRow(); filled.push(f.dataKey); note(f, 'filled', 'filled after MCA showed the box'); if (f.type !== 'select') verifyJobs.push(job); }
            else { dropRow(); markFailed(f, r.err || 'could not fill'); }
          } catch (e) { markFailed(f, friendly(e)); }
        }
        await settle(1000, 4000);
      }

      await fillTenureRows();

      // A box can keep an error raised before a related box was filled ("valid PIN code", period "To" date):
      // ask MCA to validate the PIN and period boxes again now that everything is in.
      try {
        const recheckKeys = [...Object.keys(pinFilled), 'periodFrom', 'periodTo'].filter(k => byKey[k] && present(data[k]));
        let rechecked = 0;
        for (const k of recheckKeys) { const r = await inject(tabId, pageAdt1, ['recheck', { selector: byKey[k].selector, onlyIfError: true }], 20000); if (r && !r.skipped) rechecked++; }
        if (rechecked) { await settle(800, 3000); await reaffirmAreas(); }
      } catch (_) { }

      // AEM can repaint a field from its model a moment after it was filled. Look at every field we
      // filled once more, put back any that went blank or changed, and report what still differs.
      // (pageVerify is not used: its digits-only comparison treats an empty box as equal to any text
      // without digits.)
      if (verifyJobs.length) {
        step('Checking the values stayed in place');
        try {
          const stillThere = (job, pk) => {
            if (!pk || !pk.rendered) return true;       // the field went away with its section; nothing to compare
            if (job.kind === 'radio') return (pk.checked || []).some(t => compact(t) === compact(job.value));
            if (pk.empty) return false;
            return compact(pk.value) === compact(job.value) || (/\d/.test(job.value) && pk.value.replace(/\D/g, '') === job.value.replace(/\D/g, ''));
          };
          const differing = async jobs => {
            const state = await peekByJob(jobs);
            return jobs.filter(j => !stillThere(j, state[j.id])).map(j => ({ job: j, now: (state[j.id] && (state[j.id].value || (state[j.id].checked || [])[0])) || 'empty' }));
          };
          const peekByJob = async jobs => {
            const r = await inject(tabId, pageAdt1, ['peek', { items: jobs.map(j => ({ key: j.id, selector: j.selector })), wait: 0 }], 30000);
            return (r && r.state) || {};
          };
          await new Promise(res => setTimeout(res, 1500));
          let bad = await differing(verifyJobs);
          if (bad.length) {
            step('Re-entering ' + bad.length + ' value(s) that did not stay');
            await inject(tabId, pageFill, [bad.map(b => b.job)], 180000);
            await new Promise(res => setTimeout(res, 1200));
            bad = await differing(bad.map(b => b.job));
          }
          for (const b of bad) {
            const f = byKey[b.job.id] || { dataKey: b.job.id, label: (rows.find(r => r.dataKey === b.job.id) || {}).label || b.job.id };
            const i = filled.indexOf(f.dataKey); if (i >= 0) filled.splice(i, 1);
            const row = rows.find(r => r.dataKey === f.dataKey);
            if (row) rows.splice(rows.indexOf(row), 1);
            markFailed(f, 'the value did not stay on the form (now "' + b.now + '")');
          }
        } catch (e) { mcaMessages.push('Value check skipped: ' + friendly(e)); }
      }

      const scan = async () => {
        try {
          const r = await inject(tabId, pageAdt1, ['scan', { marker: APPT_MARKER }], 30000);
          return (r && r.missing) || [];
        } catch (_) { return []; }
      };
      step('Checking for unanswered required questions');
      const syncManualRows = () => {
        for (const label of needsManual) rows.push({ dataKey: 'manual:' + label, label, status: 'needs-review', reason: 'Answer this on the MCA page by hand' });
      };
      // A known question the data gave no value for gets a hint, so the person knows why it was left.
      const hintFor = m => {
        const text = m.q || normQ(m.label);
        const q = QUESTIONS.find(x => !present(data[x.key]) && new RegExp(x.pattern, 'i').test(text));
        return q ? ' (no value was sent: pick ' + (q.allowNA ? 'Yes/No/Not Applicable' : 'Yes/No') + ' in the dashboard)' : '';
      };
      const addManual = list => {
        for (const m of list) { const label = m.label + hintFor(m); if (!needsManual.includes(label)) needsManual.push(label); }
      };
      addManual(await scan());
      for (const h of handOffs) if (!needsManual.includes(h)) needsManual.push(h);

      if (!filled.length) {
        syncManualRows();
        return out(false, 'fill', 'Nothing could be filled on the Appointment step' + (failed.length ? ': ' + failed.slice(0, 3).map(x => x.key + ' (' + x.reason + ')').join('; ') : '') + '. Save was not clicked.');
      }

      // Save, then behave like a careful person: read every red message MCA shows, fix what the data can
      // fix (re-enter the value with a real Tab, answer the question, fill the late rows, re-run the PIN
      // lookup), and Save again. Up to three rounds; stops as soon as a round changes nothing.
      const repaired = [], unfixable = [];
      const unmarkFailed = key => { for (let i = failed.length - 1; i >= 0; i--) if (failed[i].key === key) failed.splice(i, 1); for (let i = rows.length - 1; i >= 0; i--) if (rows[i].dataKey === key && rows[i].status === 'invalid') rows.splice(i, 1); };
      const fieldByName = name => name ? fields.find(f => f.selector.includes('"' + name + '"')) : null;
      const bareLabel = s => String(s).split(' — ')[0].split(' (')[0].trim();
      // A box that a repair fixed is no longer "to answer by hand" / "not shown".
      const clearPending = (label, key) => {
        for (let i = needsManual.length - 1; i >= 0; i--) if (bareLabel(needsManual[i]) === bareLabel(label)) needsManual.splice(i, 1);
        for (let i = handOffs.length - 1; i >= 0; i--) if (bareLabel(handOffs[i]) === bareLabel(label)) handOffs.splice(i, 1);
        for (let i = notShown.length - 1; i >= 0; i--) if (notShown[i] === label) notShown.splice(i, 1);
        for (let i = rows.length - 1; i >= 0; i--) if ((rows[i].dataKey === key && rows[i].status === 'skipped') || (rows[i].dataKey === 'manual:' + label)) rows.splice(i, 1);
      };
      const handOver = text => { const b = bareLabel(text); for (let i = needsManual.length - 1; i >= 0; i--) if (bareLabel(needsManual[i]) === b) needsManual.splice(i, 1); if (!unfixable.some(u => bareLabel(u) === b)) unfixable.push(text); };
      // The tolerant radio-option match of the first pass, reused by the repair round.
      const matchOption = (options, value) => {
        let hit = null;
        for (const texts of (options || [])) { hit = texts.find(x => compact(x) === compact(value)); if (hit) break; }
        if (hit) return hit;
        const words = s => normQ(s).replace(/\bre appoint/g, 'reappoint').split(' ').filter(w => w.length > 2 && !['the', 'and', 'for', 'any'].includes(w));
        const want = words(value), cands = [];
        for (const texts of (options || [])) { const x = texts.find(y => want.length && want.every(w => words(y).includes(w))); if (x) cands.push(x); }
        return cands.length === 1 ? cands[0] : null;
      };
      const repairFromMca = async round => {
        const got = await inject(tabId, pageAdt1, ['fieldErrors', {}], 30000);
        // MCA's PAN message is not acted on: it is raised while the form is still being filled and goes away
        // once the step is saved, so re-typing the PAN only restarts the same check.
        const errs = ((got && got.errors) || []).filter(e => (e.inPanel || !e.name) && !/valid\s+pan/i.test(e.text || ''));
        if (!errs.length) return 0;
        let done = 0, tenureNeeded = false, pinNeeded = {};
        const seenNames = new Set();
        for (const e of errs) {
          if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) break;
          const key = e.name || (e.labels || [])[0] || e.text;
          if (seenNames.has(key)) continue; seenNames.add(key);
          const label = (e.labels || []).find(l => l && !/^(yes|no|not applicable)$/i.test(l)) || e.text;
          const f = fieldByName(e.name);
          const text = e.text;
          const say = what => { repaired.push(label + ': ' + what); done++; };
          try {
            // 1. a PIN code MCA calls invalid: run the lookup again (type + Tab)
            if (/valid pin/i.test(text) || (f && PIN_GROUPS[f.dataKey])) {
              const pk = f && PIN_GROUPS[f.dataKey] ? f.dataKey : Object.keys(PIN_GROUPS).find(k => byKey[k] && byKey[k].selector.includes('"' + e.name + '"'));
              if (pk && present(data[pk])) { pinNeeded[pk] = true; continue; }
            }
            // 2. the Area / locality list (before the generic step: a select is never "re-typed")
            if (e.tag === 'SELECT' && (/area|locality/i.test(label) || (f && Object.keys(PIN_GROUPS).some(k => PIN_GROUPS[k].area === f.dataKey)))) {
              const pk = Object.keys(PIN_GROUPS).find(k => (f && PIN_GROUPS[k].area === f.dataKey) || (byKey[PIN_GROUPS[k].area] && byKey[PIN_GROUPS[k].area].selector.includes('"' + e.name + '"')));
              if (pk && present(data[pk])) { pinNeeded[pk] = true; continue; }
            }
            // 3. the period "To" date (MCA checks it against the AGM date and the 5-year limit)
            if (/greater than 5 years/i.test(text) || (f && ['agmDate', 'periodFrom', 'periodTo'].includes(f.dataKey))) {
              const okKeys = [];
              for (const k of ['agmDate', 'periodFrom', 'periodTo']) {
                if (!(byKey[k] && present(data[k]) && toDMY(data[k]))) continue;
                const r = await inject(tabId, pageAdt1, ['commitField', { selector: byKey[k].selector, value: toDMY(data[k]) }], 30000);
                if (r && r.ok && !r.error) { okKeys.push(byKey[k].label); unmarkFailed(k); clearPending(byKey[k].label, k); if (!filled.includes(k)) filled.push(k); }
              }
              if (okKeys.length) say('re-entered ' + okKeys.join(', ')); else handOver(label + ' — MCA says: ' + text);
              continue;
            }
            // 4. a known box we have data for: enter it again, Tab out
            if (f && present(data[f.dataKey])) {
              if (f.type === 'radio') {
                const pk = (await peek([f], 2000))[f.dataKey] || {};
                const hit = matchOption(pk.options, String(data[f.dataKey]));
                if (hit) { const r = await fillOne({ id: f.dataKey, kind: 'radio', selector: f.selector, index: 0, value: hit }); if (r.ok) { unmarkFailed(f.dataKey); clearPending(f.label, f.dataKey); say('ticked ' + hit); continue; } }
                handOver(label + ' — MCA says: ' + text);
                continue;
              }
              const v = f.type === 'date' ? (toDMY(data[f.dataKey]) || '') : String(data[f.dataKey]).trim();
              if (!v) { handOver(label + ' — MCA says: ' + text); continue; }
              const r = await inject(tabId, pageAdt1, ['commitField', { selector: f.selector, value: v }], 30000);
              if (r && r.ok && !r.error) { unmarkFailed(f.dataKey); clearPending(f.label, f.dataKey); if (!filled.includes(f.dataKey)) filled.push(f.dataKey); say('re-entered'); }
              else if (r && r.ok) handOver(label + ' — MCA says: ' + r.error + ' (re-entered "' + v + '", MCA still refuses it)');
              else if (r && r.hidden) handOver(label + ' — MCA says: ' + text + ' (the box is locked by MCA)');
              else handOver(label + ' — MCA says: ' + text + (r && r.err ? ' (' + r.err + ')' : ''));
              continue;
            }
            // 4. a Yes/No question we have an answer for
            if (e.type === 'radio' && e.empty) {
              const q = QUESTIONS.find(x => present(data[x.key]) && new RegExp(x.pattern, 'i').test(e.q || normQ(label)));
              if (q) { if (await answerQuestion(q, true)) { unmarkFailed(q.key); clearPending(label, q.key); clearPending(q.label, q.key); say('answered ' + String(data[q.key])); } else handOver(label + ' — MCA says: ' + text); continue; }
            }
            // 5. a previous-tenure row box: rebuild the rows
            if (/membership number of auditor|financial year (start|end)|firm registration number|number of financial year/i.test(label) && !f) { tenureNeeded = true; continue; }
            // nothing in the data can fix it: hand it over with MCA's own words
            handOver(label === text ? text : label + ' — MCA says: ' + text);
          } catch (err) { handOver(label + ' — ' + friendly(err)); }
        }
        for (const pk of Object.keys(pinNeeded)) {
          const g = PIN_GROUPS[pk], af = byKey[g.area];
          const pr = await inject(tabId, pageAdt1, ['pinTab', { pinSelector: byKey[pk].selector, areaSelector: af ? af.selector : '', value: String(data[pk]).trim(), wait: 8000, force: true }], 60000);
          if (pr && pr.ok && pr.options) {
            repaired.push(byKey[pk].label + ': PIN entered again (' + (pr.how || 'tabbed out') + ')'); done++;
            unmarkFailed(pk); clearPending(byKey[pk].label, pk);
            await settle(1200, 6000);
            const apk = af ? (await peek([af], 2000, true))[af.dataKey] || {} : {};
            if (af && apk.rendered && apk.empty && (apk.optionTexts || []).length) {
              const want = present(data[g.area]) ? String(data[g.area]).trim() : '';
              const listed = want && apk.optionTexts.some(o => compact(o) === compact(want) || compact(o).includes(compact(want)));
              if (listed) { const r = await fillOne({ id: af.dataKey, kind: 'text', selector: af.selector, index: 0, value: want }); if (r.ok) { unmarkFailed(af.dataKey); clearPending(af.label, af.dataKey); repaired.push(af.label + ': chosen'); } }
              else await autoPickArea(pk, 'MCA asked for it again');
              await settle(1500, 8000);
            }
          } else handOver(byKey[pk].label + ' — MCA listed no locality after entering the PIN again: type the PIN on the page, press Tab, then pick the area');
        }
        if (tenureNeeded) { await fillTenureRows(); done++; repaired.push('previous-tenure rows entered again'); }
        if (done) await settle(1200, 6000);
        return done;
      };
      // After Next has moved on and Previous brought the step back: every value the data holds is
      // checked once more, and any box MCA dropped in the transition is filled again.
      const refillMissing = async () => {
        const refilled = [];
        try {
          const back = await reaffirmAreas();
          if (back) refilled.push('Area/Locality');
          const want = fields.filter(f => present(data[f.dataKey]) && !condition(f));
          const state = await peek(want, 0);
          for (const f of want) {
            const pk = state[f.dataKey];
            if (!pk || !pk.rendered || !pk.empty) continue;
            let value = String(data[f.dataKey]).trim();
            if (f.type === 'date') { const d = toDMY(value); if (!d) continue; value = d; }
            const job = { id: f.dataKey, kind: f.type === 'radio' ? 'radio' : f.type === 'date' ? 'date' : 'text', selector: f.selector, index: 0, value };
            if (f.type === 'radio') { const hit = matchOption(pk.options, value); if (!hit) continue; job.value = hit; }
            const r = await fillOne(job);
            if (r.ok && !r.hidden) { refilled.push(f.label); if (!filled.includes(f.dataKey)) filled.push(f.dataKey); }
          }
          // unanswered questions that have an answer in the data
          for (const m of await scan()) {
            if (m.kind !== 'radio') continue;
            const q = QUESTIONS.find(x => present(data[x.key]) && new RegExp(x.pattern, 'i').test(m.q || normQ(m.label)));
            if (q && await answerQuestion(q, true)) refilled.push(q.label);
          }
          // the previous-tenure rows
          if (present(data.numPriorFinancialYears) && byKey.priorRow1Membership) {
            const pk1 = (await peek([byKey.priorRow1Membership], 0)).priorRow1Membership || {};
            if (pk1.rendered && pk1.empty) { await fillTenureRows(); refilled.push('previous-tenure rows'); }
          }
          if (refilled.length) await settle(1200, 6000);
        } catch (e) { mcaMessages.push('Back-check: ' + friendly(e)); }
        return refilled;
      };

      // What MCA shows right now, as one string: a repair round that leaves it unchanged is not progress.
      const errorSignature = async () => { try { const g = await inject(tabId, pageAdt1, ['fieldErrors', {}], 30000); return ((g && g.errors) || []).map(e => (e.name || e.labels && e.labels[0] || '') + '|' + e.text).sort().join('\n'); } catch (_) { return ''; } };

      if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) return out(false, 'fill', 'Stopped by you: Next was not clicked.');
      // Next runs the same validation Save would, shows the red messages when something is wrong, and
      // moves to the attachments step when everything is in order. So: click Next, read the messages,
      // fix what the data can fix, click Next again - Save is never clicked.
      let nx = null, advanced = false, nextClicked = false, mcaErrors = [], backNote = '', backChecked = false;
      // Everything is in: click this step's Save once, as a person does, before Next. MCA's PAN message
      // only goes away after a save, so it is neither checked nor repaired before this point.
      let saveNote = '';
      // The previous-tenure table (4(n) to 4(s)) must be complete before Save: look at its boxes, type any
      // empty one again with a real Tab, and say what is left.
      const ensureTenure = async () => {
        try {
          const keys = ['numPriorFinancialYears', 'priorRow1FirmReg', 'priorRow1Membership', 'priorRow1FyStart', 'priorRow1FyEnd'].filter(k => byKey[k] && present(data[k]));
          if (!keys.length) return '';
          const emptyKeys = async wait => { const st = await peek(keys.map(k => byKey[k]), wait); return keys.filter(k => st[k] && st[k].rendered && st[k].empty); };
          let empties = await emptyKeys(3000);
          if (empties.length) { try { await fillTenureRows(); } catch (_) { } empties = await emptyKeys(0); }
          for (const k of empties) {
            const f = byKey[k], v = f.type === 'date' ? (toDMY(data[k]) || '') : String(data[k]).trim();
            if (!v) continue;
            step('Typing ' + f.label + ' again');
            await inject(tabId, pageAdt1, ['commitField', { selector: f.selector, value: v }], 30000);
            await settle(500, 2000);
          }
          const still = empties.length ? await emptyKeys(0) : [];
          return still.length ? ' Previous-tenure table still empty: ' + still.map(k => byKey[k].label).join(', ') + '.' : ' Previous-tenure table filled.';
        } catch (e) { return ' Previous-tenure check skipped: ' + friendly(e) + '.'; }
      };
      let tenureNote = await ensureTenure();
      try {
        step('All fields filled: clicking Save');
        const sv = await inject(tabId, pageAdt1, ['save', { marker: APPT_MARKER }], 90000);
        if (sv) for (const d of (sv.dialogs || [])) mcaMessages.push(String(d));
        saveNote = sv && sv.saved ? ' Save went through.' : (sv && sv.clicked ? ' Save was clicked (MCA gave no success message).' : ' Save could not be clicked: ' + ((sv && sv.err) || 'no answer from the page') + '.');
        await settle(800, 3000);
        // Save revalidates the step: re-fill any previous-tenure box it cleared before Next.
        tenureNote = await ensureTenure();
      } catch (e) { saveNote = ' Save step skipped: ' + friendly(e) + '.'; }
      saveNote += tenureNote;
      for (let round = 0; round < 5; round++) {
        step(round ? 'Clicking Next again (round ' + (round + 1) + ')' : 'Clicking Next');
        nx = await inject(tabId, pageAdt1, ['nextStep', { marker: APPT_MARKER }], 60000);
        if (nx) for (const d of (nx.dialogs || [])) mcaMessages.push(String(d));
        nextClicked = !!(nx && nx.clicked) || nextClicked;
        advanced = !!(nx && nx.advanced);
        mcaErrors = (nx && nx.errors) || [];
        // First time Next moves on: come back with Previous and double-check nothing was dropped.
        if (advanced && !backChecked && round < 3 && !(runOpts && runOpts.isCancelled && runOpts.isCancelled())) {
          backChecked = true;
          step('Next moved on: clicking Previous to double-check nothing was lost');
          const pv = await inject(tabId, pageAdt1, ['prevStep', { marker: APPT_MARKER }], 60000);
          if (pv && pv.back) {
            await settle(1200, 6000);
            const refilled = await refillMissing();
            backNote = refilled.length
              ? ' After moving on, Previous brought the step back for a double-check: re-filled ' + [...new Set(refilled)].slice(0, 8).join(', ') + ', then Next was clicked again.'
              : ' After moving on, Previous brought the step back for a double-check: everything was still in place, so Next was clicked again.';
            advanced = false;
            continue;
          }
          backNote = ' (The double-check with Previous was skipped: ' + ((pv && pv.err) || 'no answer from the page') + '.)';
        }
        if (advanced || round === 4) break;
        if (runOpts && runOpts.isCancelled && runOpts.isCancelled()) break;
        // The repaint after a refused Next can clear the Area selects: put them back first.
        try { await reaffirmAreas(); } catch (_) { }
        step('MCA refused Next: reading its messages and fixing what the data can fix');
        const sigBefore = await errorSignature();
        let n2 = 0;
        try { n2 = await repairFromMca(round + 1); }
        catch (e) { mcaMessages.push('Repair skipped: ' + friendly(e)); n2 = 0; }
        if (!n2) break;                                               // nothing the data can change: stop
        const sigAfter = await errorSignature();
        if (sigAfter && sigAfter === sigBefore) { for (const l of sigAfter.split('\n')) { const [, txt] = l.split('|'); if (txt) handOver(l.split('|')[0] ? l.replace('|', ' — MCA says: ') : txt); } break; }   // MCA shows exactly the same: stop
      }
      for (const e of mcaErrors) mcaMessages.push(e);
      if (advanced) { needsManual.length = 0; for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i].dataKey || '').startsWith('manual:')) rows.splice(i, 1); }
      else addManual(await scan());
      for (const h of handOffs) if (!needsManual.some(m => bareLabel(m) === bareLabel(h))) needsManual.push(h);
      for (const u of unfixable) { for (let i = needsManual.length - 1; i >= 0; i--) if (bareLabel(needsManual[i]) === bareLabel(u) && needsManual[i] !== u) needsManual.splice(i, 1); if (!needsManual.includes(u)) needsManual.push(u); }
      syncManualRows();
      const repairNote = saveNote + (repaired.length ? ' Fixed after MCA\'s check: ' + [...new Set(repaired)].slice(0, 8).join('; ') + '.' : '');

      const manualNote = (autoChosen.length ? ' Chosen automatically, please check: ' + autoChosen.join('; ').replace(/([^.])$/, '$1.') : '') + (needsManual.length ?' Still to answer on MCA by hand: ' + needsManual.join(' | ').replace(/[.\s]+$/, '') + '.' : '') +
        (notShown.length ? ' Not shown on MCA, so not entered: ' + notShown.join(', ') + '. If that is unexpected, answer the question above them and run Fill ADT-1 again.' : '');
      const failNote = failed.length ? ' Could not fill: ' + failed.map(x => x.key + ' (' + x.reason + ')').join('; ') + '.' : '';
      if (advanced) {
        return out(failed.length === 0, failed.length ? 'fill' : null,
          'Appointment details filled (' + filled.length + ' fields) and Next opened the next step (attachments and declaration): stopped there.' + backNote + repairNote + failNote + manualNote,
          { saved: true, notShown: notShown.slice(), nextClicked: true, advanced: true });
      }
      let why;
      if (!nx || !nx.clicked) why = (nx && nx.err) || 'the Next button could not be clicked';
      else if (mcaErrors.length) why = 'MCA shows: ' + [...new Set(mcaErrors)].slice(0, 6).join(' | ');
      else why = 'the form stayed on the Appointment step with no message from MCA';
      why = String(why).replace(/[.\s]+$/, '');
      return out(false, 'next', 'Filled ' + filled.length + ' fields but Next did not go through: ' + why + '.' + backNote + repairNote + failNote + manualNote, { saved: false, nextClicked, advanced: false });

    } catch (e) {
      return out(false, 'fill', friendly(e));
    }
  }

  // ---- Attachments and Declaration step -------------------------------------------------------
  const ATTACH_SLOTS = [
    { key: 'intimation', label: '(a) Copy of the intimation sent by company' },
    { key: 'consent', label: '(b) Copy of written consent given by auditor' },
    { key: 'optional', label: '(e) Optional attachment' }
  ];
  const DECLARATION_KEYS = ['resolutionNumber', 'resolutionDate', 'signatoryDesignation', 'signatoryIdentifier'];

  // Is the Attachments step on screen? Looks for up to waitMs while MCA renders it.
  async function detectAttachments(tabId, waitMs) {
    const until = Date.now() + (waitMs || 0);
    for (;;) {
      try { const r = await inject(tabId, pageAttach, ['probe', {}], 15000); if (r && r.open) return true; } catch (_) { }
      if (Date.now() >= until) return false;
      await new Promise(res => setTimeout(res, 800));
    }
  }

  // files: { intimation, consent, optional } each { name, type, b64 } (any may be missing).
  // Uploads every given file, then fills the declaration boxes from the data. Never clicks Save, Next or Submit.
  async function attachStep(tabId, data, files, onStep) {
    const step = text => { if (typeof onStep === 'function') onStep(text); };
    data = data || {}; files = files || {};
    const rows = [], uploaded = [], failed = [];
    const note = (key, label, status, reason) => rows.push({ dataKey: key, label, status, reason: reason || undefined });
    try {
      step('Checking that the Attachments step is open');
      if (!(await detectAttachments(tabId, 15000))) {
        return { ok: false, message: 'The Attachments step is not open. Open Form ADT-1 on "Attachments" (the step after Appointment and Auditor Details) and try again.', uploaded, failed, fields: rows };
      }
      for (const s of ATTACH_SLOTS) {
        const file = files[s.key];
        if (!file || !file.b64) { note(s.key, s.label, 'skipped', 'no file chosen'); continue; }
        step('Uploading ' + s.label + ': ' + file.name);
        let r;
        try { r = await inject(tabId, pageAttach, ['attach', { slot: s.key, file: { name: file.name, type: file.type || 'application/pdf', b64: file.b64 } }], 120000); }
        catch (e) { r = { ok: false, err: friendly(e) }; }
        if (r && r.ok) { uploaded.push(s.label); note(s.key, s.label, 'filled', (r.note || '') + ' [' + file.name + ']'); }
        else { failed.push(s.label + ': ' + ((r && r.err) || 'no answer from the page')); note(s.key, s.label, 'invalid', (r && r.err) || 'no answer from the page'); }
      }

      // Declaration: resolution number and date, designation and DIN of the director who will sign.
      const jobs = [];
      for (const k of DECLARATION_KEYS) {
        const f = (root.ADT1_FIELDS || []).find(x => x.dataKey === k);
        if (!f || !present(data[k])) { if (f) note(k, f.label, 'skipped', 'no value in the data'); continue; }
        const isDate = f.type === 'date';
        jobs.push({ f, job: { id: k, kind: isDate ? 'date' : 'text', selector: f.selector, index: 0, value: isDate ? (toDMY(data[k]) || String(data[k]).trim()) : String(data[k]).trim() } });
      }
      if (jobs.length) {
        step('Filling the declaration (' + jobs.length + ' boxes)');
        let res = null;
        try { res = await inject(tabId, pageFill, [jobs.map(j => j.job)], 120000); } catch (e) { res = null; failed.push('Declaration: ' + friendly(e)); }
        for (const { f, job } of jobs) {
          const r = ((res && res.results) || []).find(x => x.id === job.id);
          if (r && r.ok && !r.hidden) note(f.dataKey, f.label, 'filled');
          else { const why = (r && (r.err || r.note)) || 'not found on the page'; failed.push(f.label + ': ' + why); note(f.dataKey, f.label, 'invalid', why); }
        }
      }
      const ok = failed.length === 0 && (uploaded.length > 0 || jobs.length > 0);
      const bits = [];
      if (uploaded.length) bits.push(uploaded.length + ' file' + (uploaded.length === 1 ? '' : 's') + ' uploaded');
      if (jobs.length) bits.push('declaration filled');
      return {
        ok, uploaded, failed, fields: rows,
        message: (bits.join(', ') || 'Nothing to do (no files chosen and no declaration values)') + '.' + (failed.length ? ' Problems: ' + failed.join(' | ') + '.' : '') +
          ' Next, Save and the digital signature are left to you.'
      };
    } catch (e) {
      return { ok: false, message: friendly(e), uploaded, failed, fields: rows };
    }
  }

  root.Adt1Engine = { run: run, runAppointment: runAppointment, detectStep: detectStep, detectAttachments: detectAttachments, attachStep: attachStep };
})(typeof window !== "undefined" ? window : globalThis);
