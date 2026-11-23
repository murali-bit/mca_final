# Germin8 (extension)

Chrome extension (Manifest V3, side panel) that auto-fills MCA e-forms on `www.mca.gov.in`.
Forms: **AOC-4**, **AOC-4 Offline**, **SPICe+ Part A**, **INC-32**, **DIR-3 KYC**, **MGT-7** (beta), **ADT-1** (beta).

This folder is the extension only. The Germin8 dashboard that prepares client data for it
(company lookup via Filesure, document upload and extraction, reconciliation) lives in the
sibling [`../dashboard`](../dashboard) folder.

## Install

1. Open `chrome://extensions/`.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and pick this `extension/` folder.
4. Copy the extension's **ID** from that page; the dashboard needs it to hand clients over directly.
5. Click the toolbar icon to open the side panel. After editing files here, press **Reload** on `chrome://extensions/`.

## Pairing with the dashboard

`manifest.json`'s `externally_connectable` trusts any page served from `http://localhost` / `http://127.0.0.1`,
not just the dashboard. Generate a pairing key in the dashboard (**Settings**, then **Extension**, then **Pairing key**),
copy it, and paste the same value into the side panel's **Connection** card at the bottom
(**Dashboard pairing key**, then Save). Once set, `background.js` rejects any `importClient`
call whose key does not match; until then, the `localhost` match alone gates access.

## Files

```
extension/
  manifest.json
  background.js              (onMessageExternal handler: receives clients from the dashboard)
  content_script.js
  popup.html / popup.js      (side panel UI)
  css/
    tokens.css               (design tokens; byte-identical mirror of dashboard/css/tokens.css)
    icons.css                (line-icon masks; byte-identical mirror of dashboard/css/icons.css)
    styles.css               (side panel layout and components)
  js/
    forms-registry.js        (the supported forms, their phases and icons)
    filler.js
    field-maps/              (per-form field maps: aoc4, aoc4-offline, spice-a, inc32, dir3, mgt7, adt1)
    page-automation.js
    phase-runner.js          (AOC-4 online, phase by phase)
    offline-engine.js        (AOC-4 Offline: MCA's v3offline Angular page)
    adt1-engine.js / adt1-flow.js
    extractor.js / field-mapper.js / pdf-extractor.js
    storage.js / validator.js / error-handler.js
    ui/                      (toasts, timeline, error panel, data card, form picker, field extractor, run status)
  data/                      (err-catalog.json, field-mappings.json)
  clients/                   (local client JSON; git-ignored, real client data)
  libs/                      (PDF.js; git-ignored binaries, see libs/README.txt)
  config.local.example.js    (copy to config.local.js; git-ignored)
```

## Debug

- Right-click the side panel, then **Inspect**, for panel logs.
- On the MCA tab, the DevTools console shows content-script errors.
- On `chrome://extensions/`, **service worker** opens the background logs.
