/**
 * Meta Hunter Pro (Ad Oracle) - Background Service Worker (Manifest V3)
 * Orchestrates local vault communication, storage sync, and badge telemetry.
 */

const LOCAL_SERVER_BASE = 'http://localhost:3000';

// Default configuration settings
const DEFAULT_CONFIG = {
  trafficLightEnabled: true,
  exclusionEngineEnabled: true,
  rtoCalculatorEnabled: true,
  huntBarEnabled: true,
  sidebarEnabled: true,
  maxPageLikes: 100000,
  defaultRtoRate: 30,
  defaultSellingPrice: 1299,
  defaultSourcingCost: 350,
  filterCorporateKeywords: true
};

function getServerBase(callback) {
  chrome.storage.local.get(['vaultServerUrl'], (result) => {
    const base = (result.vaultServerUrl || 'http://localhost:3000').trim().replace(/\/+$/, '');
    callback(base);
  });
}

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['oracleConfig', 'vaultServerUrl'], (result) => {
    if (!result.oracleConfig) {
      chrome.storage.local.set({ oracleConfig: DEFAULT_CONFIG });
      console.log('[Ad Oracle] Default settings initialized in local storage.');
    }
    if (!result.vaultServerUrl) {
      chrome.storage.local.set({ vaultServerUrl: 'http://localhost:3000' });
    }
  });
});

// Message listener for content scripts & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING_SERVER') {
    getServerBase((base) => {
      fetch(`${base}/api/health`)
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data, serverUrl: base }))
        .catch(err => sendResponse({ success: false, error: err.message, serverUrl: base }));
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'SAVE_AD_TO_VAULT') {
    getServerBase((base) => {
      fetch(`${base}/api/save-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.payload)
      })
        .then(res => res.json())
        .then(data => {
          console.log('[Ad Oracle] Ad successfully secured in vault:', data);
          sendResponse({ success: true, data });
        })
        .catch(err => {
          console.error(`[Ad Oracle] Failed to vault ad to ${base}:`, err);
          sendResponse({ success: false, error: err.message });
        });
    });
    return true;
  }

  if (request.action === 'SAVE_STORE_TO_VAULT') {
    getServerBase((base) => {
      fetch(`${base}/api/save-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.payload)
      })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.action === 'GET_CONFIG') {
    chrome.storage.local.get(['oracleConfig', 'vaultServerUrl'], (result) => {
      sendResponse({
        success: true,
        config: result.oracleConfig || DEFAULT_CONFIG,
        serverBaseUrl: (result.vaultServerUrl || 'http://localhost:3000').trim().replace(/\/+$/, '')
      });
    });
    return true;
  }

  if (request.action === 'UPDATE_CONFIG') {
    chrome.storage.local.set({ oracleConfig: request.config }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'UPDATE_BADGE') {
    const count = request.winnerCount || 0;
    if (sender.tab && sender.tab.id) {
      chrome.action.setBadgeText({
        tabId: sender.tab.id,
        text: count > 0 ? String(count) : ''
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: sender.tab.id,
        color: '#10B981' // Neon emerald for winners
      });
    }
    sendResponse({ success: true });
    return true;
  }
});
