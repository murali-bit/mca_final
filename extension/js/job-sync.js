// Reports fill progress for a job loaded from the dashboard queue back to the backend.
// Every filler (AOC-4 phase runner, ADT-1 engine, MGT-7/DIR-3 filler, offline engine) already
// drives the timeline, whose state changes surface as window "aoc:log" events — so progress is
// read from there rather than from each engine. Only the job that is currently loaded reports.

(function (root) {
  "use strict";
  if (!root.Timeline || root.JobSync) return;

  let form = null;
  const originalRender = root.Timeline.render;
  root.Timeline.render = function (formType) {
    form = formType || "aoc4";
    return originalRender.apply(this, arguments);
  };

  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  let lastSent = "";
  let queued = null;
  let timer = null;

  async function activeJobFor(formType) {
    const { activeJob, clientInfo } = await chrome.storage.local.get(["activeJob", "clientInfo"]);
    if (!activeJob || activeJob.formType !== formType) return null;
    // The user may have switched to another client for the same form since loading the job.
    if (clientInfo && clientInfo.id && norm(clientInfo.id) !== norm(activeJob.clientKey)) return null;
    return activeJob;
  }

  // Phases can change several times a second (setActive closes earlier steps first), so only
  // the latest state in each short window is sent.
  function queue(report, formType) {
    queued = { report, formType };
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  }

  async function flush() {
    const item = queued;
    queued = null;
    if (!item) return;
    const job = await activeJobFor(item.formType);
    if (!job) return;
    const key = JSON.stringify([job.jobId, item.report.status, item.report.phase, item.report.result.state, item.report.result.message]);
    if (key === lastSent) return;
    lastSent = key;
    try {
      await chrome.runtime.sendMessage(Object.assign({ action: "REPORT_JOB", jobId: job.jobId }, item.report));
    } catch (_) { /* background asleep or backend offline: the next state change reports again */ }
  }

  root.addEventListener("aoc:log", function (e) {
    const detail = e.detail || {};
    const ctx = detail.ctx;
    if (!ctx || !ctx.stepId || !ctx.state || ctx.state === "pending" || !form) return;
    const def = (root.FORMS || {})[form];
    if (!def) return;
    const idx = def.phases.findIndex(p => p.id === ctx.stepId);
    if (idx < 0) return;
    const step = def.phases[idx];
    const isLast = idx === def.phases.length - 1;
    const status = ctx.state === "error" ? "needs_attention"
      : ctx.state === "done" && isLast ? "filled"
      : "filling";
    const msg = String(detail.msg || "");
    const message = msg.startsWith(step.label) ? msg.slice(step.label.length).replace(/^\s*—\s*/, "") : msg;
    queue({
      status: status,
      phase: idx + 1,
      result: { step: step.id, stepLabel: step.label, state: ctx.state, message: message, totalSteps: def.phases.length, at: Date.now() },
    }, form);
  });

  root.JobSync = { flush: flush };
})(typeof window !== "undefined" ? window : globalThis);
