# MGT-7 form field map (compact)

Source: MCA e-filing page `https://www.mca.gov.in/content/mca/global/en/mca/e-filing/annual-filings/form-mgt7.html`
(Title: "MGT-7 - Annual Return other than OPCs and Small Companies")

## What the page is
- AEM Adaptive Form (`guideBridge` exists). No Angular, no shadow DOM, no cross-origin iframes.
- The real form lives in an iframe: `.../form-mgt7/jcr:content/root/responsivegrid/aemform.iframe.en.html` (probe frame index 3). Always query inside that frame.
- 753 DOM inputs total, only ~135 visible at a time (the form is multi-step; other sections are hidden in the DOM until reached).
- Input ids are generated: `guideContainer-rootPanel-<path>-<widget>`. Many labels are just "Text box", so use the id/path + `mgt7_outline.txt` for meaning.

## Files
- `mgt7_fields.tsv`  – one row per input (idx, type, flags, label, options, path alias, last id part) + PATHS table at the bottom.
  Full id = `guideContainer-rootPanel-` + PATHS[P#] + `-` + last. If the path is empty, id = last. If the path starts with `=`, id = path (without `=`) + `-` + last.
  flags: V visible, R required, D disabled, O readonly.
- `mgt7_outline.txt` – headings and question text of the form, in order.

## How to use (save tokens)
- Do NOT cat these files. Use `grep -i "<keyword>" mgt7_fields.tsv` or `awk -F'\t' '$3 ~ /R/'` to find what you need.
- Look up headings with `grep -n -i "<keyword>" mgt7_outline.txt`.

## Added in the extension
- `mgt7-fields.json` – the same scan as JSON: every input with its full `id` / `name`, blank-form flags, and `dataKey` where `js/field-maps/mgt7.js` fills it (102 fields).
- MCA rejects small companies and OPCs on this form ("Company is small company. Please file MGT-7A"), so a re-scan with a CIN needs a company that files plain MGT-7.
