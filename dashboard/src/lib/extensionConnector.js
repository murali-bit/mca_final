/**
 * Germin8 Extension Connector
 * Bridges the React Dashboard (localhost) directly to the Germin8 Chrome Extension (MV3).
 *
 * Uses `chrome.runtime.sendMessage(extensionId, payload, callback)` which Chrome allows
 * when the extension's manifest lists this origin in `externally_connectable`.
 */

export const EXTENSION_STORAGE_KEY = 'germin8_extension_id';
export const PAIRING_STORAGE_KEY = 'germin8_pairing_key';

// Map dashboard form codes to the extension's internal formType identifier
export const FORM_CODE_TO_EXT_TYPE = {
  'AOC-4': 'aoc4',
  'AOC-4-OFFLINE': 'aoc4_offline',
  'MGT-7': 'mgt7',
  'DIR-3-KYC': 'dir3',
  'ADT-1': 'adt1',
  'SPICE-A': 'spice_a',
  'INC-32': 'inc32',
};

/**
 * Returns saved extension configuration from localStorage.
 */
export function getSavedExtensionConfig() {
  const extId = (typeof window !== 'undefined' && localStorage.getItem(EXTENSION_STORAGE_KEY)) || '';
  const pairingKey = (typeof window !== 'undefined' && localStorage.getItem(PAIRING_STORAGE_KEY)) || '';
  return { extId, pairingKey };
}

/**
 * Saves extension configuration to localStorage.
 */
export function saveExtensionConfig({ extId, pairingKey }) {
  if (typeof window !== 'undefined') {
    if (extId !== undefined) localStorage.setItem(EXTENSION_STORAGE_KEY, extId.trim());
    if (pairingKey !== undefined) localStorage.setItem(PAIRING_STORAGE_KEY, pairingKey.trim());
  }
}

/**
 * Checks whether the browser supports Chrome Extension communication.
 */
export function isChromeExtensionBridgeAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.chrome !== 'undefined' &&
    typeof window.chrome.runtime !== 'undefined' &&
    typeof window.chrome.runtime.sendMessage === 'function'
  );
}

/**
 * Pings the Germin8 Chrome Extension to test connection and query capabilities.
 * @param {string} customId - Optional extension ID to test (falls back to saved)
 * @param {string} customKey - Optional pairing key
 */
export async function pingExtension(customId, customKey) {
  const cfg = getSavedExtensionConfig();
  const id = (customId !== undefined ? customId : cfg.extId).trim();
  const key = (customKey !== undefined ? customKey : cfg.pairingKey).trim();

  if (!id) {
    return {
      connected: false,
      error: 'Please enter your 32-letter Germin8 Extension ID from chrome://extensions.',
    };
  }

  if (!/^[a-p]{32}$/.test(id)) {
    return {
      connected: false,
      error: 'Extension ID must be exactly 32 lowercase letters (a–p), e.g. "abcdefghijklmnopabcdefghijklmnop".',
    };
  }

  if (!isChromeExtensionBridgeAvailable()) {
    return {
      connected: false,
      error: 'Chrome extension bridge is only available in Chromium browsers (Chrome, Brave, Edge) running on http://localhost.',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          connected: false,
          error: 'Connection timed out after 5s. Verify the extension is loaded & enabled in chrome://extensions.',
        });
      }
    }, 5000);

    const payload = { action: 'ping' };
    if (key) payload.key = key;

    try {
      window.chrome.runtime.sendMessage(id, payload, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const lastErr = window.chrome.runtime.lastError;
        if (lastErr) {
          const msg = lastErr.message || '';
          if (/not exist|Could not establish|Receiving end/i.test(msg)) {
            return resolve({
              connected: false,
              error: 'Extension not found with this ID. Ensure it is enabled in chrome://extensions and manifest has externally_connectable for localhost.',
            });
          }
          return resolve({ connected: false, error: msg });
        }

        if (!res) {
          return resolve({ connected: false, error: 'Extension responded with empty payload.' });
        }

        if (!res.ok) {
          return resolve({ connected: false, error: res.error || 'Extension refused connection.' });
        }

        resolve({
          connected: true,
          name: res.name || 'Germin8 MCA Auto Filler',
          version: res.version || '1.5.0',
          supports: res.supports || ['aoc4', 'aoc4_offline', 'spice_a', 'inc32', 'dir3', 'adt1', 'mgt7'],
        });
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ connected: false, error: err.message });
      }
    }
  });
}

/**
 * Pushes the current dashboard form draft directly into the Germin8 Extension storage.
 */
export async function sendDraftToExtension(formCode, draftData, customId, customKey) {
  const cfg = getSavedExtensionConfig();
  const id = (customId !== undefined ? customId : cfg.extId).trim();
  const key = (customKey !== undefined ? customKey : cfg.pairingKey).trim();

  if (!id) {
    return { ok: false, error: 'Extension ID is required to sync. Please configure your Extension ID first.' };
  }

  const formType = FORM_CODE_TO_EXT_TYPE[formCode] || 'aoc4';

  const clientInfo = {
    id: (draftData.cin || formCode).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    name: draftData.companyName || draftData.proposedName1 || draftData.auditorName || `${formCode} Draft`,
    cin: draftData.cin || '',
    formType: formType,
    updatedAt: new Date().toISOString(),
    source: 'dashboard-connector',
  };

  if (!isChromeExtensionBridgeAvailable()) {
    return {
      ok: false,
      error: 'Direct browser sync requires Chrome with the Germin8 extension installed. Use "Download JSON" below instead.',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'Sync request timed out after 8s.' });
      }
    }, 8000);

    const message = {
      action: 'importClient',
      formType: formType,
      formData: draftData,
      clientInfo: clientInfo,
    };
    if (key) message.key = key;

    try {
      window.chrome.runtime.sendMessage(id, message, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const lastErr = window.chrome.runtime.lastError;
        if (lastErr) {
          return resolve({ ok: false, error: lastErr.message });
        }
        if (!res) {
          return resolve({ ok: false, error: 'No response from extension.' });
        }
        if (!res.ok) {
          return resolve({ ok: false, error: res.error || 'Extension rejected draft.' });
        }

        resolve({
          ok: true,
          id: res.id,
          name: res.name || clientInfo.name,
          formType: res.formType || formType,
          storedKeys: res.storedKeys || Object.keys(draftData),
        });
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      }
    }
  });
}

/**
 * Sends a full nested AOC-4 client (extension/clients/*_aoc4.json shape) to the
 * extension, which stores it under importedClients ready for the AOC-4 filler.
 */
export async function sendAoc4ClientToExtension(client) {
  const { extId, pairingKey } = getSavedExtensionConfig();
  if (!extId) return { ok: false, error: 'Extension ID not set — add it in MCA Forms Hub → Extension Bridge.' };
  if (!isChromeExtensionBridgeAvailable()) {
    return { ok: false, error: 'Direct send needs Chrome with the Germin8 extension installed.' };
  }
  const message = { action: 'importClient', formType: 'aoc4', client };
  if (pairingKey) message.key = pairingKey;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'Extension did not answer within 8s.' }), 8000);
    try {
      window.chrome.runtime.sendMessage(extId, message, (res) => {
        clearTimeout(timer);
        const lastErr = window.chrome.runtime.lastError;
        if (lastErr) return resolve({ ok: false, error: lastErr.message });
        resolve(res || { ok: false, error: 'No response from extension.' });
      });
    } catch (err) {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    }
  });
}

/**
 * Downloads the draft formatted as a Germin8 Extension client JSON file.
 */
export function downloadExtensionPayload(formCode, draftData) {
  const formType = FORM_CODE_TO_EXT_TYPE[formCode] || 'aoc4';
  const fileName = `${formCode}_${draftData.cin || 'draft'}_germin8.json`;
  const payload = {
    clientInfo: {
      id: (draftData.cin || formCode).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      name: draftData.companyName || draftData.proposedName1 || `${formCode} Client`,
      cin: draftData.cin || '',
      exportedAt: new Date().toISOString(),
      source: 'germin8-dashboard',
    },
    formType: formType,
    formData: draftData,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

