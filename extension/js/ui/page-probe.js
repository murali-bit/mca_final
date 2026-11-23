// Page probe (Phase 0, dev-only): reports what the open MCA page is actually built with, so the
// scan/fill path is chosen from evidence instead of assumption. Read-only: it changes nothing on the
// page, opens no tab, and only ever looks at the MCA tab the user already has open.
//
// Reports, per frame:
//   - typeof window.guideBridge (AEM Adaptive Forms) and how many nodes its model holds
//   - Angular markers (window.ng, [ng-version], AngularJS, Angular Material widgets)
//   - field count, and how many carry id / name / formcontrolname
//   - whether fields sit inside iframes or (open) shadow roots
//
// The card is shown only in an unpacked (developer-mode) install.

(function (root) {
  "use strict";
  if (root.PageProbe) return;

  let last = null;

  // Runs inside the MCA page in the MAIN world (needs page globals). Must stay self-contained:
  // it is serialized for injection.
  function pageProbe() {
    const safe = fn => { try { return fn(); } catch (_) { return undefined; } };
    const FIELD_SEL = "input:not([type=hidden]), select, textarea";

    // --- AEM Adaptive Forms ---
    const gb = window.guideBridge;
    const guideBridge = { type: typeof gb, hasVisit: false, hasResolveNode: false, modelNodes: null, connected: null };
    if (gb) {
      guideBridge.hasVisit = typeof gb.visit === "function";
      guideBridge.hasResolveNode = typeof gb.resolveNode === "function";
      guideBridge.connected = safe(() => typeof gb.isConnected === "function" ? !!gb.isConnected() : null);
      if (guideBridge.hasVisit) {
        let n = 0;
        safe(() => gb.visit(() => { n++; }));
        guideBridge.modelNodes = n;
      }
    }

    // --- Angular / other frameworks ---
    const ngVersionEl = document.querySelector("[ng-version]");
    const angular = {
      windowNg: typeof window.ng,
      ngVersion: ngVersionEl ? ngVersionEl.getAttribute("ng-version") : null,
      getAllAngularRootElements: typeof window.getAllAngularRootElements,
      angularJs: typeof window.angular,
      angularJsVersion: safe(() => window.angular && window.angular.version && window.angular.version.full) || null,
      ngAppAttr: !!document.querySelector("[ng-app], [data-ng-app]"),
      matWidgets: document.querySelectorAll("mat-select, mat-form-field, mat-option, .mat-select, .mat-mdc-select").length,
    };
    angular.detected = angular.windowNg !== "undefined" || !!angular.ngVersion
      || angular.getAllAngularRootElements !== "undefined" || angular.angularJs !== "undefined" || angular.ngAppAttr;
    const other = {
      jQuery: safe(() => window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) || null,
      react: typeof window.React !== "undefined" || !!document.querySelector("[data-reactroot]"),
      guideContainer: !!document.querySelector('[id^="guideContainer"], .guideContainerNode, [data-guide-id]'),
    };

    // --- Fields in this document, plus any open shadow roots under it ---
    const count = { total: 0, withId: 0, withName: 0, withFormControlName: 0, withAriaLabel: 0, jqName: 0, visible: 0, readOnlyOrDisabled: 0, inShadowRoot: 0 };
    const samples = [];
    const tally = (el, inShadow) => {
      count.total++;
      if (el.id) count.withId++;
      const name = el.getAttribute("name");
      if (name) count.withName++;
      if (name && /___jqName$/.test(name)) count.jqName++;
      if (el.hasAttribute("formcontrolname")) count.withFormControlName++;
      if (el.getAttribute("aria-label")) count.withAriaLabel++;
      if (el.readOnly || el.disabled) count.readOnlyOrDisabled++;
      if (inShadow) count.inShadowRoot++;
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) count.visible++;
      if (samples.length < 5 && (r.width > 0 || r.height > 0)) {
        samples.push({
          tag: el.tagName.toLowerCase(), type: el.type || "",
          id: (el.id || "").slice(0, 120), name: (name || "").slice(0, 160),
          formcontrolname: el.getAttribute("formcontrolname") || "",
          ariaLabel: (el.getAttribute("aria-label") || "").slice(0, 100),
        });
      }
    };
    let shadowRoots = 0;
    const walk = (scope, inShadow) => {
      scope.querySelectorAll(FIELD_SEL).forEach(el => tally(el, inShadow));
      scope.querySelectorAll("*").forEach(el => {
        if (el.shadowRoot) { shadowRoots++; walk(el.shadowRoot, true); }
      });
    };
    walk(document, false);

    // --- Iframes seen from this frame ---
    const iframes = [...document.querySelectorAll("iframe, frame")].map(f => {
      const doc = safe(() => f.contentDocument);
      return {
        src: (f.getAttribute("src") || "").slice(0, 200),
        sameOrigin: !!doc,
        fields: doc ? doc.querySelectorAll(FIELD_SEL).length : null,   // null = cross-origin, cannot see in
        visible: f.getBoundingClientRect().height > 0,
      };
    });

    return {
      url: location.href.split("?")[0],
      isTop: window === window.top,
      readyState: document.readyState,
      guideBridge, angular, other, fields: count, samples,
      shadowRoots,                      // open shadow roots only; closed ones are not detectable
      iframes,
    };
  }

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = id => document.getElementById(id);

  // Turns the per-frame reports into one conclusion: which scan/fill path the evidence supports.
  function summarize(frames) {
    const withFields = frames.filter(f => f.fields.total > 0);
    const gbFrames = frames.filter(f => f.guideBridge.type !== "undefined");
    const ngFrames = frames.filter(f => f.angular.detected);
    const total = frames.reduce((n, f) => n + f.fields.total, 0);
    const sum = k => frames.reduce((n, f) => n + f.fields[k], 0);
    const fieldsInIframes = withFields.some(f => !f.isTop);
    const blindIframes = frames.reduce((n, f) => n + f.iframes.filter(i => !i.sameOrigin).length, 0);
    return {
      path: gbFrames.length ? "guideBridge" : "dom",
      guideBridge: gbFrames.length ? "exists" : "undefined",
      guideBridgeFrames: gbFrames.map(f => f.isTop ? "top" : f.url),
      angular: ngFrames.length ? "yes" : "no",
      matWidgets: frames.reduce((n, f) => n + f.angular.matWidgets, 0),
      fields: { total, withId: sum("withId"), withName: sum("withName"), withFormControlName: sum("withFormControlName"), jqName: sum("jqName"), visible: sum("visible") },
      fieldsInIframes,
      fieldsInShadowRoots: sum("inShadowRoot"),
      shadowRoots: frames.reduce((n, f) => n + f.shadowRoots, 0),
      framesProbed: frames.length,
      crossOriginIframes: blindIframes,
    };
  }

  function row(label, value, tag, cls) {
    return '<li><div class="ex-main"><span class="ex-label">' + esc(label) + '</span><span class="ex-sub">' + esc(value) +
      '</span></div>' + (tag ? '<span class="ex-tags"><em class="' + (cls || "") + '">' + esc(tag) + "</em></span>" : "") + "</li>";
  }

  function render() {
    const list = $("probeList"), meta = $("probeMeta");
    if (!list || !last) return;
    const s = last.summary, f = s.fields;
    const pct = n => f.total ? " (" + Math.round((n / f.total) * 100) + "%)" : "";
    const top = last.frames.find(x => x.isTop) || last.frames[0];
    const rows = [
      row("window.guideBridge", s.guideBridge === "exists"
        ? "Found in " + s.guideBridgeFrames.join(", ") + ". Model nodes: " + last.frames.filter(x => x.guideBridge.modelNodes != null).map(x => x.guideBridge.modelNodes).join(" / ")
        : "typeof window.guideBridge is \"undefined\" in every frame", s.guideBridge, s.guideBridge === "exists" ? "ok" : "warn"),
      row("Angular", s.angular === "yes"
        ? "window.ng: " + top.angular.windowNg + ", ng-version: " + (top.angular.ngVersion || "none") + ", AngularJS: " + (top.angular.angularJsVersion || top.angular.angularJs) + ", Material widgets: " + s.matWidgets
        : "No window.ng, no [ng-version], no AngularJS, " + s.matWidgets + " Material widgets", s.angular, s.angular === "yes" ? "warn" : "ok"),
      row("Fields", f.total + " total, " + f.visible + " visible, across " + s.framesProbed + " frame(s)", String(f.total)),
      row("Fields with id", f.withId + pct(f.withId), ""),
      row("Fields with name", f.withName + pct(f.withName) + (f.jqName ? ", " + f.jqName + " end in ___jqName (AEM)" : ""), ""),
      row("Fields with formcontrolname", f.withFormControlName + pct(f.withFormControlName), ""),
      row("Fields inside iframes", s.fieldsInIframes
        ? last.frames.filter(x => !x.isTop && x.fields.total).map(x => x.fields.total + " in " + x.url).join("; ")
        : "All fields are in the top document" + (s.crossOriginIframes ? " (" + s.crossOriginIframes + " cross-origin iframe(s) could not be inspected)" : ""),
        s.fieldsInIframes ? "yes" : "no", s.fieldsInIframes ? "warn" : "ok"),
      row("Fields inside shadow roots", s.fieldsInShadowRoots + " field(s) in " + s.shadowRoots + " open shadow root(s)",
        s.fieldsInShadowRoots ? "yes" : "no", s.fieldsInShadowRoots ? "warn" : "ok"),
      row("Other", "jQuery: " + (top.other.jQuery || "none") + ", guideContainer markup: " + (top.other.guideContainer ? "yes" : "no") + ", readyState: " + top.readyState, ""),
      row("Suggested scan/fill path", s.path === "guideBridge"
        ? "guideBridge model (MAIN world), DOM as the cross-check"
        : "Plain DOM (no guideBridge on this page)", s.path, "ok"),
    ];
    list.innerHTML = rows.join("");
    meta.textContent = "Probed " + last.url + " at " + new Date(last.probedAt).toLocaleTimeString() + ". Copy the JSON and send it back.";
    $("probeCopyBtn").disabled = false;
  }

  async function run() {
    const btn = $("probeRunBtn");
    const say = (level, title, body) => { if (root.Toasts) root.Toasts[level]({ title, body }); };
    btn.disabled = true;
    try {
      if (typeof getActiveMcaTab !== "function") throw new Error("Tab lookup is not available.");
      if (typeof RUN !== "undefined") RUN.tabId = null;
      const tab = await getActiveMcaTab();   // the user's existing MCA tab; never opens one
      if (!tab) { say("error", "No MCA tab", "Open the form page on mca.gov.in yourself, then probe."); return; }
      const res = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, world: "MAIN", func: pageProbe });
      const frames = res.map(r => r && r.result).filter(Boolean);
      if (!frames.length) throw new Error("The page returned nothing. Wait for it to finish loading and probe again.");
      last = { probedAt: Date.now(), url: (tab.url || "").split("?")[0], summary: summarize(frames), frames };
      render();
      say("success", "Probe done: " + last.summary.path + " path", last.summary.fields.total + " fields, guideBridge " + last.summary.guideBridge + ", Angular " + last.summary.angular);
    } catch (err) {
      if (root.ErrorHandler) root.ErrorHandler.handle(err, { source: "pageProbe" });
      else say("error", "Could not probe the page", err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function copy() {
    if (!last) return;
    const text = JSON.stringify(last, null, 2);
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
    if (root.Toasts) root.Toasts.success({ title: "Probe result copied as JSON" });
  }

  // Unpacked (developer-mode) installs have no update_url; store installs do.
  function isDevInstall() {
    try { return !("update_url" in chrome.runtime.getManifest()); } catch (_) { return false; }
  }

  function bind() {
    const card = $("probeCard");
    if (!card || !$("probeRunBtn")) return;
    if (!isDevInstall()) return;          // stays hidden outside developer mode
    card.classList.remove("hidden");
    $("probeRunBtn").addEventListener("click", run);
    $("probeCopyBtn").addEventListener("click", copy);
  }

  root.PageProbe = { bind, run, summarize, _pageProbe: pageProbe };
})(typeof window !== "undefined" ? window : globalThis);
