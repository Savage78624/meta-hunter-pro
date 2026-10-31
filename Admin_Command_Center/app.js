/**
 * ============================================================================
 * Meta Hunter Pro (Ad Oracle) - Admin Command Center Controller
 * ============================================================================
 * Connects directly to local Node.js Express server on http://localhost:3000
 * Manages Vault Ads Grid, Competitor Stores Table, and Indian RTO Sandbox.
 * ============================================================================
 */

// Dynamic API Base: Automatically uses relative cloud origin when hosted on Render / Web, or localhost fallback
const API_BASE = (window.location.origin && window.location.origin.startsWith('http') && !window.location.href.startsWith('file:'))
  ? `${window.location.origin.replace(/\/+$/, '')}/api`
  : 'http://localhost:3000/api';

// Global State
const appState = {
  ads: [],
  stores: [],
  activeFilter: 'all',
  mediaFilter: 'all',
  daysThreshold: 0,
  searchQuery: '',
  isOnline: false
};

// DOM Elements
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const adsGrid = document.getElementById('ads-grid');
const adsEmptyState = document.getElementById('ads-empty-state');
const storesTableBody = document.getElementById('stores-table-body');
const adsSearchInput = document.getElementById('ads-search-input');
const btnRefresh = document.getElementById('btn-refresh');
const btnExportCsv = document.getElementById('btn-export-csv');

// Navigation Tabs
const tabBtnAds = document.getElementById('tab-btn-ads');
const tabBtnStores = document.getElementById('tab-btn-stores');
const tabBtnSimulator = document.getElementById('tab-btn-simulator');
const viewAds = document.getElementById('view-ads');
const viewStores = document.getElementById('view-stores');
const viewSimulator = document.getElementById('view-simulator');

// KPI Counters
const kpiTotalAds = document.getElementById('kpi-total-ads');
const kpiWinnerAds = document.getElementById('kpi-winner-ads');
const kpiTotalStores = document.getElementById('kpi-total-stores');
const kpiAvgRoas = document.getElementById('kpi-avg-roas');

// Modal Elements
const modalAddStore = document.getElementById('modal-add-store');
const btnAddStoreModal = document.getElementById('btn-add-store-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const formAddStore = document.getElementById('form-add-store');

// ----------------------------------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initSimulator();
  initTopBarCalculator();
  checkServerHealth();
  fetchVaultData();

  // Periodic health ping every 10 seconds
  setInterval(checkServerHealth, 10000);
});

// ----------------------------------------------------------------------------
// SERVER HEALTH & VAULT SYNC
// ----------------------------------------------------------------------------
async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (data.status === 'online') {
      appState.isOnline = true;
      serverStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      serverStatusText.textContent = 'Vault Online (Port 3000)';
      serverStatusText.className = 'text-emerald-400';
    }
  } catch (err) {
    appState.isOnline = false;
    serverStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    serverStatusText.textContent = 'Vault Offline';
    serverStatusText.className = 'text-rose-400';
  }
}

async function fetchVaultData() {
  try {
    btnRefresh.classList.add('animate-spin');
    const res = await fetch(`${API_BASE}/vault`);
    const data = await res.json();

    if (data.success) {
      appState.ads = data.ads || [];
      appState.stores = data.stores || [];

      updateKpis();
      updateFilterCounts();
      renderAdsGrid();
      renderStoresTable();
    }
  } catch (err) {
    console.error('[Admin] Error fetching vault data:', err);
  } finally {
    setTimeout(() => {
      btnRefresh.classList.remove('animate-spin');
    }, 400);
  }
}

// ----------------------------------------------------------------------------
// KPI SUMMARY METRICS
// ----------------------------------------------------------------------------
function updateKpis() {
  const totalAds = appState.ads.length;
  const winnerAds = appState.ads.filter(a => a.daysActive >= 14 || a.status === 'Winner').length;
  const totalStores = appState.stores.length;

  // Compute average breakeven ROAS
  let roasSum = 0;
  let roasCount = 0;
  appState.ads.forEach(a => {
    if (a.rtoMetrics && parseFloat(a.rtoMetrics.breakevenRoas)) {
      roasSum += parseFloat(a.rtoMetrics.breakevenRoas);
      roasCount++;
    }
  });
  const avgRoas = roasCount > 0 ? (roasSum / roasCount).toFixed(2) : '2.50';

  kpiTotalAds.textContent = totalAds;
  kpiWinnerAds.textContent = winnerAds;
  kpiTotalStores.textContent = totalStores;
  kpiAvgRoas.textContent = `${avgRoas}x`;
}

function updateFilterCounts() {
  const allCount = appState.ads.length;
  const winnersCount = appState.ads.filter(a => a.daysActive >= 14 || a.status === 'Winner').length;
  const testingCount = appState.ads.filter(a => (a.daysActive >= 5 && a.daysActive < 14) || a.status === 'Testing').length;
  const volatileCount = appState.ads.filter(a => a.daysActive < 5 || a.status === 'Volatile').length;

  document.getElementById('count-filter-all').textContent = allCount;
  document.getElementById('count-filter-winners').textContent = winnersCount;
  document.getElementById('count-filter-testing').textContent = testingCount;
  document.getElementById('count-filter-volatile').textContent = volatileCount;
}

// ----------------------------------------------------------------------------
// RENDER: SAVED WINNING ADS GRID
// ----------------------------------------------------------------------------
function renderAdsGrid() {
  adsGrid.innerHTML = '';

  const query = appState.searchQuery.toLowerCase().trim();
  const filtered = appState.ads.filter(ad => {
    // Status Filter
    if (appState.activeFilter === 'Winner') {
      if (ad.daysActive < 14 && ad.status !== 'Winner') return false;
    } else if (appState.activeFilter === 'Testing') {
      if ((ad.daysActive < 5 || ad.daysActive >= 14) && ad.status !== 'Testing') return false;
    } else if (appState.activeFilter === 'Volatile') {
      if (ad.daysActive >= 5 && ad.status !== 'Volatile') return false;
    }

    // Lifespan Duration Filter
    if (appState.daysThreshold > 0) {
      if ((ad.daysActive || 1) < appState.daysThreshold) return false;
    }

    // Media Filter (Video vs Image)
    if (appState.mediaFilter !== 'all') {
      const isVideo = ad.mediaType === 'video' ||
                      (ad.mediaUrl && (ad.mediaUrl.includes('.mp4') || ad.mediaUrl.includes('video'))) ||
                      (ad.adCopy && ad.adCopy.toLowerCase().includes('video'));
      if (appState.mediaFilter === 'video' && !isVideo) return false;
      if (appState.mediaFilter === 'image' && isVideo) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    adsEmptyState.classList.remove('hidden');
    return;
  }
  adsEmptyState.classList.add('hidden');

  filtered.forEach(ad => {
    const isWinner = ad.daysActive >= 14 || ad.status === 'Winner';
    const isTesting = (ad.daysActive >= 5 && ad.daysActive < 14) || ad.status === 'Testing';

    let cardBorder = 'border-gray-800';
    let statusPillClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    let statusGlow = '';
    let statusLabel = 'Volatile ⚠️';

    if (isWinner) {
      cardBorder = 'border-emerald-500/40';
      statusPillClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      statusGlow = 'glow-winner';
      statusLabel = 'Winner 🔥';
    } else if (isTesting) {
      cardBorder = 'border-amber-500/30';
      statusPillClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      statusGlow = 'glow-testing';
      statusLabel = 'Testing ⚡';
    }

    const rto = ad.rtoMetrics || {
      sellingPrice: 1299,
      sourcingCost: 350,
      rtoRate: 30,
      breakevenRoas: '2.44',
      netMarginPerDelivered: 580
    };

    const card = document.createElement('div');
    card.className = `glass-panel rounded-2xl border ${cardBorder} ${statusGlow} flex flex-col justify-between overflow-hidden transition duration-300`;

    card.innerHTML = `
      <div>
        <!-- Card Top Bar -->
        <div class="p-4 border-b border-gray-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${statusPillClass}">
              ${statusLabel}
            </span>
            <span class="text-xs font-bold text-gray-200">${ad.daysActive} Days Running</span>
          </div>
          <button class="btn-delete-ad text-gray-500 hover:text-rose-400 text-xs p-1 transition" data-id="${ad.id}" title="Delete Ad from Vault">
            🗑️
          </button>
        </div>

        <!-- Media Preview / Thumbnail -->
        <div class="relative bg-dark-950 aspect-video w-full overflow-hidden flex items-center justify-center">
          ${ad.mediaUrl ? `
            <img src="${ad.mediaUrl}" alt="${ad.brand} Creative" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'text-gray-500 text-xs font-mono\\'>No Media Preview</div>';" />
          ` : `
            <div class="text-gray-600 text-xs font-mono flex flex-col items-center gap-1">
              <span>🖼️</span>
              <span>Visual Creative Ad</span>
            </div>
          `}
          <div class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-gray-300">
            ID: ${ad.id}
          </div>
        </div>

        <!-- Brand & Details -->
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white truncate max-w-[70%]">${ad.brand}</h3>
            <span class="text-[10px] font-semibold text-gray-400 bg-dark-800 px-2 py-0.5 rounded border border-gray-700">
              ${ad.platform || 'Shopify'}
            </span>
          </div>

          <!-- Ad Copy Excerpt -->
          <p class="text-xs text-gray-300 line-clamp-2 leading-relaxed italic">
            "${ad.adCopy || 'No ad copy text intercepted.'}"
          </p>

          <!-- Compact Performance Metrics Strip -->
          <div class="flex items-center justify-between text-xs bg-dark-800/90 border border-gray-800/80 rounded-xl px-3 py-2">
            <div class="flex items-center gap-1.5">
              <span class="text-brand-400 font-bold">Target ROAS:</span>
              <span class="font-extrabold text-white">${rto.breakevenRoas || '2.44'}x</span>
            </div>
            <div class="text-gray-400 text-[11px]">
              Est. Margin: <strong class="text-blue-400 font-bold">₹${rto.netMarginPerDelivered || '580'}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Action Links -->
      <div class="p-4 pt-0 flex items-center justify-between gap-2 border-t border-gray-800/60 mt-3 pt-3">
        <a href="https://www.facebook.com/ads/library/?id=${ad.id}" target="_blank" class="flex-1 py-1.5 px-3 bg-dark-800 hover:bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold text-center border border-gray-700 transition flex items-center justify-center gap-1">
          <span>Meta Ads</span> ↗
        </a>
        ${ad.landingPage ? `
          <a href="${ad.landingPage}" target="_blank" class="flex-1 py-1.5 px-3 bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 rounded-xl text-xs font-semibold text-center border border-brand-500/30 transition flex items-center justify-center gap-1">
            <span>Storefront</span> ↗
          </a>
        ` : `
          <span class="flex-1 text-center text-[11px] text-gray-500 py-1.5">No URL</span>
        `}
      </div>
    `;

    adsGrid.appendChild(card);
  });

  // Attach delete handlers
  document.querySelectorAll('.btn-delete-ad').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm(`Remove Ad #${id} from the vault?`)) {
        await deleteAd(id);
      }
    });
  });
}

async function deleteAd(id) {
  try {
    const res = await fetch(`${API_BASE}/ad/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      appState.ads = appState.ads.filter(a => String(a.id) !== String(id));
      updateKpis();
      updateFilterCounts();
      renderAdsGrid();
    }
  } catch (err) {
    alert(`Failed to delete ad: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// RENDER: MONITORED COMPETITOR STORES TABLE
// ----------------------------------------------------------------------------
function renderStoresTable() {
  storesTableBody.innerHTML = '';

  if (appState.stores.length === 0) {
    storesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-gray-500">
          No competitor stores registered yet. Click "+ Add Competitor Store" above.
        </td>
      </tr>
    `;
    return;
  }

  appState.stores.forEach(store => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-800/50 transition';

    let platformBadgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (store.platform === 'WooCommerce') {
      platformBadgeClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    } else if (store.platform === 'Custom Ecom') {
      platformBadgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }

    tr.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="font-bold text-white">${store.brand}</div>
        <a href="${store.storeUrl}" target="_blank" class="text-brand-400 hover:underline flex items-center gap-1 text-[11px]">
          ${store.storeUrl} ↗
        </a>
      </td>
      <td class="py-3.5 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${platformBadgeClass}">
          ${store.platform}
        </span>
      </td>
      <td class="py-3.5 px-4 font-medium text-gray-200">
        ${store.niche || 'D2C Dropshipping'}
      </td>
      <td class="py-3.5 px-4 text-gray-400 max-w-xs truncate" title="${store.notes}">
        ${store.notes || 'No intelligence notes.'}
      </td>
      <td class="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
        ${store.firstSeen || 'Recent'}
      </td>
      <td class="py-3.5 px-4">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
        </span>
      </td>
      <td class="py-3.5 px-4 text-right space-x-2">
        <a href="${store.storeUrl}" target="_blank" class="px-2.5 py-1 bg-dark-800 hover:bg-gray-800 text-gray-300 hover:text-white rounded text-[11px] font-semibold border border-gray-700 transition inline-block">
          Visit ↗
        </a>
        <button class="btn-delete-store text-gray-500 hover:text-rose-400 p-1 transition" data-id="${store.id}" title="Delete Store">
          🗑️
        </button>
      </td>
    `;

    storesTableBody.appendChild(tr);
  });

  // Attach store delete handlers
  document.querySelectorAll('.btn-delete-store').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm(`Remove this store from monitoring?`)) {
        await deleteStore(id);
      }
    });
  });
}

async function deleteStore(id) {
  try {
    const res = await fetch(`${API_BASE}/store/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      appState.stores = appState.stores.filter(s => String(s.id) !== String(id));
      updateKpis();
      renderStoresTable();
    }
  } catch (err) {
    alert(`Failed to delete store: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// INTERACTIVE INDIAN COD RTO SIMULATOR ENGINE
// ----------------------------------------------------------------------------
function initSimulator() {
  const simSp = document.getElementById('sim-sp');
  const simCogs = document.getElementById('sim-cogs');
  const simRto = document.getElementById('sim-rto');
  const simRtoLabel = document.getElementById('sim-rto-label');
  const simFwd = document.getElementById('sim-fwd');
  const simRev = document.getElementById('sim-rev');

  const outRoas = document.getElementById('sim-out-roas');
  const outCpa = document.getElementById('sim-out-cpa');
  const outMargin = document.getElementById('sim-out-margin');

  const ledgerDelivered = document.getElementById('sim-ledger-delivered');
  const ledgerReturned = document.getElementById('sim-ledger-returned');
  const ledgerRevenue = document.getElementById('sim-ledger-revenue');
  const ledgerCogs = document.getElementById('sim-ledger-cogs');
  const ledgerShipping = document.getElementById('sim-ledger-shipping');
  const ledgerGross = document.getElementById('sim-ledger-gross');
  const statusBadge = document.getElementById('sim-status-badge');

  function calculateSimulator() {
    const sp = parseFloat(simSp.value) || 0;
    const cogs = parseFloat(simCogs.value) || 0;
    const rtoPct = parseFloat(simRto.value) || 30;
    const rto = rtoPct / 100;
    const fwd = parseFloat(simFwd.value) || 70;
    const rev = parseFloat(simRev.value) || 60;

    simRtoLabel.textContent = `${rtoPct}%`;

    // 100 Orders Economics
    const totalOrders = 100;
    const delivered = totalOrders * (1 - rto);
    const returned = totalOrders * rto;
    const totalRevenue = delivered * sp;
    const totalCogs = delivered * cogs;
    const totalShipping = (totalOrders * fwd) + (returned * rev);
    const grossMarginPool = totalRevenue - totalCogs - totalShipping;

    ledgerDelivered.textContent = `${Math.round(delivered)} Orders`;
    ledgerReturned.textContent = `${Math.round(returned)} Orders`;
    ledgerRevenue.textContent = `₹${Math.round(totalRevenue).toLocaleString('en-IN')}`;
    ledgerCogs.textContent = `₹${Math.round(totalCogs).toLocaleString('en-IN')}`;
    ledgerShipping.textContent = `₹${Math.round(totalShipping).toLocaleString('en-IN')}`;
    ledgerGross.textContent = `₹${Math.round(grossMarginPool).toLocaleString('en-IN')}`;

    if (grossMarginPool <= 0) {
      outRoas.textContent = 'UNVIABLE';
      outRoas.className = 'text-2xl font-black text-rose-500 mt-1';
      outCpa.textContent = '₹0';
      outMargin.textContent = '0%';
      statusBadge.textContent = 'Dead On Arrival (Negative Margin)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20';
      return;
    }

    const maxCpa = Math.round(grossMarginPool / totalOrders);
    const breakevenRoas = (totalRevenue / grossMarginPool).toFixed(2);
    const marginPct = ((grossMarginPool / totalRevenue) * 100).toFixed(1);

    outRoas.textContent = `${breakevenRoas}x`;
    outCpa.textContent = `₹${maxCpa}`;
    outMargin.textContent = `${marginPct}%`;

    if (parseFloat(breakevenRoas) <= 2.2) {
      outRoas.className = 'text-2xl font-black text-emerald-400 mt-1';
      statusBadge.textContent = 'Highly Scalable & Safe';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (parseFloat(breakevenRoas) <= 2.8) {
      outRoas.className = 'text-2xl font-black text-amber-400 mt-1';
      statusBadge.textContent = 'Moderate Margin (Tight RTO)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    } else {
      outRoas.className = 'text-2xl font-black text-rose-400 mt-1';
      statusBadge.textContent = 'Dangerous RTO Trap (>2.8x ROAS Needed)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  }

  simSp.addEventListener('input', calculateSimulator);
  simCogs.addEventListener('input', calculateSimulator);
  simRto.addEventListener('input', calculateSimulator);
  simFwd.addEventListener('input', calculateSimulator);
  simRev.addEventListener('input', calculateSimulator);

  calculateSimulator();
}

// ----------------------------------------------------------------------------
// EVENT LISTENERS & NAVIGATION
// ----------------------------------------------------------------------------
function initEventListeners() {
  // Navigation Tabs
  tabBtnAds.addEventListener('click', () => switchTab('ads'));
  tabBtnStores.addEventListener('click', () => switchTab('stores'));
  tabBtnSimulator.addEventListener('click', () => switchTab('simulator'));

  // Refresh
  btnRefresh.addEventListener('click', fetchVaultData);

  // Search
  adsSearchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value;
    renderAdsGrid();
  });

  // Filter Pills
  document.querySelectorAll('.ad-filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.ad-filter-pill').forEach(p => {
        p.classList.remove('active', 'bg-dark-800', 'text-white', 'border-gray-700');
        p.classList.add('border-transparent', 'text-gray-400');
      });

      const filter = e.currentTarget.getAttribute('data-filter');
      appState.activeFilter = filter;

      e.currentTarget.classList.add('active', 'bg-dark-800', 'text-white', 'border-gray-700');
      e.currentTarget.classList.remove('border-transparent', 'text-gray-400');

      renderAdsGrid();
    });
  });

  // Admin Media Filter Pills
  document.querySelectorAll('.admin-media-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-media-pill').forEach(p => {
        p.classList.remove('active', 'bg-dark-800', 'text-white', 'border-gray-700');
        p.classList.add('border-transparent', 'text-gray-400');
      });
      const media = e.currentTarget.getAttribute('data-media');
      appState.mediaFilter = media;
      e.currentTarget.classList.add('active', 'bg-dark-800', 'text-white', 'border-gray-700');
      e.currentTarget.classList.remove('border-transparent', 'text-gray-400');
      renderAdsGrid();
    });
  });

  // Admin Days Active Threshold Pills
  document.querySelectorAll('.admin-days-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-days-pill').forEach(p => {
        p.classList.remove('active', 'bg-dark-800', 'text-white', 'border-gray-700');
        p.classList.add('border-transparent', 'text-gray-400');
      });
      const days = parseInt(e.currentTarget.getAttribute('data-days'), 10) || 0;
      appState.daysThreshold = days;
      e.currentTarget.classList.add('active', 'bg-dark-800', 'text-white', 'border-gray-700');
      e.currentTarget.classList.remove('border-transparent', 'text-gray-400');
      renderAdsGrid();
    });
  });

  // Modal: Add Store
  btnAddStoreModal.addEventListener('click', () => modalAddStore.classList.remove('hidden'));
  modalCloseBtn.addEventListener('click', () => modalAddStore.classList.add('hidden'));
  modalCancelBtn.addEventListener('click', () => modalAddStore.classList.add('hidden'));

  formAddStore.addEventListener('submit', async (e) => {
    e.preventDefault();
    const storeUrl = document.getElementById('input-store-url').value;
    const brand = document.getElementById('input-store-brand').value;
    const platform = document.getElementById('input-store-platform').value;
    const niche = document.getElementById('input-store-niche').value;
    const notes = document.getElementById('input-store-notes').value;

    try {
      const res = await fetch(`${API_BASE}/save-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl, brand, platform, niche, notes })
      });
      const data = await res.json();
      if (data.success) {
        modalAddStore.classList.add('hidden');
        formAddStore.reset();
        fetchVaultData();
      }
    } catch (err) {
      alert(`Error saving store: ${err.message}`);
    }
  });

  // Export CSV
  btnExportCsv.addEventListener('click', exportAdsToCsv);

  // Top-Bar RTO Calculator Tool Modal Listeners
  const modalTopCalc = document.getElementById('modal-top-calculator');
  const btnOpenTopCalc = document.getElementById('btn-open-top-calculator');
  const btnCloseTopCalc = document.getElementById('btn-close-top-calculator');
  const btnCloseTopCalcAlt = document.getElementById('btn-close-top-calculator-alt');

  if (btnOpenTopCalc && modalTopCalc) {
    btnOpenTopCalc.addEventListener('click', () => modalTopCalc.classList.remove('hidden'));
    if (btnCloseTopCalc) btnCloseTopCalc.addEventListener('click', () => modalTopCalc.classList.add('hidden'));
    if (btnCloseTopCalcAlt) btnCloseTopCalcAlt.addEventListener('click', () => modalTopCalc.classList.add('hidden'));

    modalTopCalc.addEventListener('click', (e) => {
      if (e.target === modalTopCalc) modalTopCalc.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalTopCalc.classList.contains('hidden')) {
        modalTopCalc.classList.add('hidden');
      }
    });
  }
}

function switchTab(tab) {
  tabBtnAds.className = 'tab-btn px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition flex items-center gap-2';
  tabBtnStores.className = 'tab-btn px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition flex items-center gap-2';
  tabBtnSimulator.className = 'tab-btn px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition flex items-center gap-2';

  viewAds.classList.add('hidden');
  viewStores.classList.add('hidden');
  viewSimulator.classList.add('hidden');

  if (tab === 'ads') {
    tabBtnAds.className = 'tab-btn active px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 bg-brand-500 text-black shadow-md';
    viewAds.classList.remove('hidden');
  } else if (tab === 'stores') {
    tabBtnStores.className = 'tab-btn active px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 bg-brand-500 text-black shadow-md';
    viewStores.classList.remove('hidden');
  } else if (tab === 'simulator') {
    tabBtnSimulator.className = 'tab-btn active px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 bg-brand-500 text-black shadow-md';
    viewSimulator.classList.remove('hidden');
  }
}

// ----------------------------------------------------------------------------
// CSV EXPORT FOR MEDIA BUYING TEAMS
// ----------------------------------------------------------------------------
function exportAdsToCsv() {
  if (appState.ads.length === 0) {
    alert('No ads available to export.');
    return;
  }

  const headers = ['Ad ID', 'Brand', 'Days Active', 'Status', 'Selling Price (INR)', 'Sourcing Cost (INR)', 'RTO Rate %', 'Breakeven ROAS', 'Net Profit Per Order', 'Store URL', 'Meta Ads Library URL', 'Saved At'];
  const rows = appState.ads.map(ad => {
    const rto = ad.rtoMetrics || {};
    return [
      `"${ad.id}"`,
      `"${(ad.brand || '').replace(/"/g, '""')}"`,
      ad.daysActive || 1,
      ad.status || 'Winner',
      rto.sellingPrice || 1299,
      rto.sourcingCost || 350,
      rto.rtoRate || 30,
      rto.breakevenRoas || '2.44',
      rto.netMarginPerDelivered || 580,
      `"${ad.landingPage || ''}"`,
      `"https://www.facebook.com/ads/library/?id=${ad.id}"`,
      `"${ad.savedAt || ''}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Ad_Oracle_Winning_Ads_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------------------------------
// TOP-BAR RTO CALCULATOR TOOL ENGINE
// ----------------------------------------------------------------------------
function initTopBarCalculator() {
  const spInput = document.getElementById('topcalc-sp');
  const cogsInput = document.getElementById('topcalc-cogs');
  const rtoInput = document.getElementById('topcalc-rto');
  const rtoDisplay = document.getElementById('topcalc-rto-display');
  const fwdInput = document.getElementById('topcalc-fwd');
  const revInput = document.getElementById('topcalc-rev');

  const outRoas = document.getElementById('topcalc-out-roas');
  const outCpa = document.getElementById('topcalc-out-cpa');
  const outMargin = document.getElementById('topcalc-out-margin');
  const statusBadge = document.getElementById('topcalc-status-badge');

  const ledgerDelivered = document.getElementById('topcalc-ledger-delivered');
  const ledgerReturned = document.getElementById('topcalc-ledger-returned');
  const ledgerShipping = document.getElementById('topcalc-ledger-shipping');
  const ledgerPool = document.getElementById('topcalc-ledger-pool');

  const btnCopy = document.getElementById('topcalc-btn-copy');
  const copyText = document.getElementById('topcalc-copy-text');

  if (!spInput || !cogsInput || !rtoInput) return;

  function calculateTopBarRto() {
    const sp = parseFloat(spInput.value) || 0;
    const cogs = parseFloat(cogsInput.value) || 0;
    const rtoPct = parseFloat(rtoInput.value) || 30;
    const rto = rtoPct / 100;
    const fwd = parseFloat(fwdInput.value) || 70;
    const rev = parseFloat(revInput.value) || 60;

    rtoDisplay.textContent = `${rtoPct}%`;

    // 100 Orders unit economics
    const totalOrders = 100;
    const delivered = totalOrders * (1 - rto);
    const returned = totalOrders * rto;
    const totalRevenue = delivered * sp;
    const totalCogs = delivered * cogs;
    const totalCourier = (totalOrders * fwd) + (returned * rev);
    const grossMarginPool = totalRevenue - totalCogs - totalCourier;

    ledgerDelivered.textContent = `${Math.round(delivered)} / 100`;
    ledgerReturned.textContent = `${Math.round(returned)} / 100`;
    ledgerShipping.textContent = `₹${Math.round(totalCourier).toLocaleString('en-IN')}`;
    ledgerPool.textContent = `₹${Math.round(grossMarginPool).toLocaleString('en-IN')}`;

    if (grossMarginPool <= 0) {
      outRoas.textContent = 'UNVIABLE';
      outRoas.className = 'text-3xl font-black text-rose-500 mt-1';
      outCpa.textContent = '₹0';
      outMargin.textContent = 'Loss';
      statusBadge.textContent = 'Dead on Arrival (Loss)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30';
      return { sp, cogs, rtoPct, breakevenRoas: 'UNVIABLE', maxCpa: 0, netMargin: 0 };
    }

    const maxCpa = Math.round(grossMarginPool / totalOrders);
    const breakevenRoas = (totalRevenue / grossMarginPool).toFixed(2);
    const netMargin = Math.round(grossMarginPool / delivered);

    outRoas.textContent = `${breakevenRoas}x`;
    outCpa.textContent = `₹${maxCpa}`;
    outMargin.textContent = `₹${netMargin}`;

    if (parseFloat(breakevenRoas) <= 2.2) {
      outRoas.className = 'text-3xl font-black text-emerald-400 mt-1';
      statusBadge.textContent = 'Safe & Scalable (Low Risk)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    } else if (parseFloat(breakevenRoas) <= 2.8) {
      outRoas.className = 'text-3xl font-black text-amber-400 mt-1';
      statusBadge.textContent = 'Moderate Margin (Needs 2.4x+)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30';
    } else {
      outRoas.className = 'text-3xl font-black text-rose-400 mt-1';
      statusBadge.textContent = 'High RTO Trap (>2.8x ROAS)';
      statusBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30';
    }

    return { sp, cogs, rtoPct, breakevenRoas, maxCpa, netMargin };
  }

  // Live input listeners
  spInput.addEventListener('input', calculateTopBarRto);
  cogsInput.addEventListener('input', calculateTopBarRto);
  rtoInput.addEventListener('input', calculateTopBarRto);
  fwdInput.addEventListener('input', calculateTopBarRto);
  revInput.addEventListener('input', calculateTopBarRto);

  // Quick Preset Chips
  document.querySelectorAll('.topcalc-preset-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.topcalc-preset-chip').forEach(c => {
        c.classList.remove('border-brand-500', 'text-brand-400');
        c.classList.add('border-gray-700', 'text-gray-300');
      });

      const sp = e.currentTarget.getAttribute('data-sp');
      const cogs = e.currentTarget.getAttribute('data-cogs');
      const rto = e.currentTarget.getAttribute('data-rto');

      spInput.value = sp;
      cogsInput.value = cogs;
      rtoInput.value = rto;

      e.currentTarget.classList.add('border-brand-500', 'text-brand-400');
      e.currentTarget.classList.remove('border-gray-700', 'text-gray-300');

      calculateTopBarRto();
    });
  });

  // Copy Result
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const metrics = calculateTopBarRto();
      const text = `🎯 Indian COD ROAS Intelligence (Ad Oracle):
• Selling Price: ₹${metrics.sp}
• Sourcing Cost: ₹${metrics.cogs}
• Expected RTO Rate: ${metrics.rtoPct}%
• Required Breakeven ROAS: ${metrics.breakevenRoas}x
• Maximum Allowable CPA: ₹${metrics.maxCpa}
• Net Profit Per Delivered Unit: ₹${metrics.netMargin}`;

      navigator.clipboard.writeText(text).then(() => {
        if (copyText) {
          const original = copyText.textContent;
          copyText.textContent = '✓ Copied to Clipboard!';
          btnCopy.classList.add('text-brand-400', 'border-brand-500');
          setTimeout(() => {
            copyText.textContent = original;
            btnCopy.classList.remove('text-brand-400', 'border-brand-500');
          }, 2000);
        }
      });
    });
  }

  // Initial calculation
  calculateTopBarRto();
}
