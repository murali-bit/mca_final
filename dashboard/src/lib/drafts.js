// Form drafts typed or scanned in the MCA Forms Hub, kept in this browser so work
// survives navigation. Storage can be unavailable (private mode, blocked site data).
const KEY = 'germin8_form_drafts_v1';

export function loadDrafts() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDrafts(drafts) {
  try {
    const nonEmpty = {};
    for (const [code, d] of Object.entries(drafts || {})) {
      const values = d && d.values ? d.values : {};
      if (Object.values(values).some(v => v !== '' && v !== null && v !== undefined)) nonEmpty[code] = d;
    }
    localStorage.setItem(KEY, JSON.stringify(nonEmpty));
  } catch {
    /* storage unavailable: drafts live only for this page */
  }
}

export function draftProgress(form, values = {}) {
  const fields = form.sections.flatMap(s => s.fields);
  const filled = fields.filter(f => values[f.key] !== undefined && values[f.key] !== '').length;
  const missingRequired = fields.filter(f => f.required && (values[f.key] === undefined || values[f.key] === '')).length;
  return { filled, total: fields.length, pct: fields.length ? Math.round((filled / fields.length) * 100) : 0, missingRequired };
}
