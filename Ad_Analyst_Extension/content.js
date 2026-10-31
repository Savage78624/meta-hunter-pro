/**
 * ============================================================================
 * Meta Hunter Pro (Code Name: Ad Oracle) - Content Script
 * ============================================================================
 * Reverse-engineers Meta Ads Library via anti-fragile DOM heuristics:
 *  1. Scramble-resistant ad card detection via text anchors (Library ID / Date).
 *  2. Traffic Light lifespan triage (Green: >14d, Orange: 5-13d, Red: <4d).
 *  3. Indian COD True RTO Margin Calculator injected per card.
 *  4. Exclusion Engine (Hides FMCG >100k likes, Corporate/B2B keywords).
 *  5. Direct Vault sync to local Express backend (http://localhost:3000).
 *  6. Sticky Hunt Bar with one-click Indian dropshipping footprint injection.
 *  7. AI Keyword Hunter sidebar drawer.
 * ============================================================================
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__AD_ORACLE_INITIALIZED__) return;
  window.__AD_ORACLE_INITIALIZED__ = true;

  console.log('%c[Ad Oracle] Meta Hunter Pro v1.0.0 Initialized.', 'color: #10B981; font-weight: bold; font-size: 14px;');

  // State & Metrics Cache
  const state = {
    serverBaseUrl: 'http://localhost:3000',
    winnersCount: 0,
    testingCount: 0,
    volatileCount: 0,
    filteredCount: 0,
    totalProcessed: 0,
    filters: {
      mediaType: 'all', // 'all' | 'video' | 'image'
      minDaysActive: 0  // 0, 3, 7, 14, 21, 30, 90
    },
    settings: {
      trafficLightEnabled: true,
      exclusionEngineEnabled: true,
      huntBarEnabled: true,
      sidebarEnabled: true,
      maxPageLikes: 100000,
      defaultRtoRate: 30,
      defaultSellingPrice: 1299,
      defaultSourcingCost: 350
    }
  };

  // Corporate & B2B Stopwords to Exclude
  const CORPORATE_B2B_KEYWORDS = [
    'software', 'saas', 'plumbing', 'book a call', 'b2b', 'agency', 'consulting',
    'consultation', 'free demo', 'schedule a call', 'hire us', 'real estate',
    'dentist', 'dental clinic', 'law firm', 'legal advice', 'coaching program',
    'tax filing', 'iso certified', 'enterprise'
  ];

  // High-Intent Indian Dropshipping Footprints
  const INDIAN_FOOTPRINTS = [
    { label: 'COD Available', query: '"Cash on Delivery Available"' },
    { label: 'Free Delivery All India', query: '"Free Delivery All Over India"' },
    { label: '50% Off Today', query: '"50% OFF" "Shop Now"' },
    { label: 'Pay on Delivery', query: '"Pay on Delivery"' },
    { label: 'Viral TikTok', query: '"Viral on TikTok"' },
    { label: 'Buy 1 Get 1 Free', query: '"Buy 1 Get 1 Free"' },
    { label: 'Limited Stock India', query: '"Limited Stock" "Order Now"' }
  ];

  // Niche Footprints for AI Keyword Hunter Sidebar
  const NICHE_FOOTPRINTS = [
    {
      category: '🍳 Kitchen & Home Problem Solvers',
      description: 'High impulse, mass appeal products with 3x-4x markup potential.',
      queries: ['"Multifunctional Chopper"', '"Oil Spray Bottle"', '"Silicone Stretch Lids"', '"Electric Cleaning Brush"', '"Magic Mop COD"']
    },
    {
      category: '🚗 Car & Bike Accessories',
      description: 'Men-dominated buying behavior with high prepaid & COD conversion.',
      queries: ['"Car Foam Cleaner"', '"Scratch Removal Spray"', '"Mini Tire Inflator"', '"Car Trash Can"', '"Back Cushion Car"']
    },
    {
      category: '🪔 Spiritual & Pooja Items',
      description: 'Uncapped Indian emotional appeal with virtually zero returns.',
      queries: ['"Smoke Fountain Shivling"', '"Brass Diya COD"', '"Automatic Agarbatti"', '"Mantra Chanting Box"', '"Akhand Jyot"']
    },
    {
      category: '💄 Beauty, Grooming & Self-Care',
      description: 'High visual demonstration creatives with strong re-order rates.',
      queries: ['"Hair Wax Stick"', '"Hair Oil Applicator Comb"', '"Blackhead Vacuum"', '"Eyebrow Epilator"', '"Crystal Hair Eraser"']
    },
    {
      category: '⚡ Viral Gadgets & Ambient Decor',
      description: 'Aesthetic TikTok viral imports that dominate Indian Instagram feeds.',
      queries: ['"Sunset Galaxy Projector"', '"Astronaut Projector"', '"Mini Portable Thermal Printer"', '"Touch Crystal Lamp"', '"Self Stirring Mug"']
    }
  ];

  // --------------------------------------------------------------------------
  // INITIALIZATION: Load Configuration & Mount UI Overlays
  // --------------------------------------------------------------------------
  chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (response) => {
    if (response && response.success) {
      if (response.config) state.settings = { ...state.settings, ...response.config };
      if (response.serverBaseUrl) state.serverBaseUrl = response.serverBaseUrl;
    }
    initHunterInterface();
  });

  function initHunterInterface() {
    mountHuntBar();
    mountSidebarDrawer();
    mountSidebarTab();
    scanAndProcessAds();

    // Observe DOM mutations for infinite scroll loading
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        scanAndProcessAds();
      }, 250);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --------------------------------------------------------------------------
  // 1. THE HUNT BAR: Sticky Top Header with Preset Footprints, Filters & Telemetry
  // --------------------------------------------------------------------------
  function mountHuntBar() {
    if (document.getElementById('oracle-hunt-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'oracle-hunt-bar';
    bar.innerHTML = `
      <div class="oracle-hunt-top">
        <div class="oracle-brand">
          <span class="oracle-logo-badge">AD ORACLE</span>
          <div class="oracle-title">Meta Hunter Pro <span>// India D2C Intel</span></div>
        </div>

        <div class="oracle-telemetry">
          <div class="oracle-telemetry-item">
            <span>Winners:</span>
            <span class="oracle-telemetry-val oracle-val-winners" id="oracle-stat-winners">0</span>
          </div>
          <span style="color:#374151">|</span>
          <div class="oracle-telemetry-item">
            <span>Testing:</span>
            <span class="oracle-telemetry-val oracle-val-testing" id="oracle-stat-testing">0</span>
          </div>
          <span style="color:#374151">|</span>
          <div class="oracle-telemetry-item">
            <span>Filtered:</span>
            <span class="oracle-telemetry-val oracle-val-filtered" id="oracle-stat-filtered">0</span>
          </div>
        </div>

        <div class="oracle-bar-actions">
          <button class="oracle-bar-btn active" id="oracle-toggle-filter" title="Toggle Exclusion of FMCG & B2B Ads">
            🛡️ Filter (>100k Likes)
          </button>
          <button class="oracle-bar-btn" id="oracle-btn-open-sidebar">
            🔍 AI Footprints
          </button>
          <button class="oracle-bar-btn oracle-vault-link-btn" id="oracle-btn-open-admin">
            ⚡ Open Command Center
          </button>
        </div>
      </div>

      <!-- Live Media & Lifespan Filter Row in Sticky Bar -->
      <div class="oracle-hunt-filters" style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding: 4px 0; border-top: 1px solid rgba(31, 41, 55, 0.7); margin-top:2px;">
        <div style="display:flex; align-items:center; gap: 6px; flex-wrap:wrap;">
          <span style="font-size: 10px; font-weight: 800; color: #9CA3AF; text-transform: uppercase;">🎬 Media:</span>
          <button type="button" class="oracle-filter-btn oracle-media-btn active" data-media="all">All Media <span class="oracle-count-tag oracle-cnt-media-all">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-media-btn" data-media="video">🎥 Videos Only <span class="oracle-count-tag oracle-cnt-media-video">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-media-btn" data-media="image">🖼️ Images Only <span class="oracle-count-tag oracle-cnt-media-image">0</span></button>
        </div>

        <div style="display:flex; align-items:center; gap: 5px; flex-wrap:wrap;">
          <span style="font-size: 10px; font-weight: 800; color: #9CA3AF; text-transform: uppercase;">⏱️ Active:</span>
          <button type="button" class="oracle-filter-btn oracle-days-btn active" data-days="0">All Time <span class="oracle-count-tag oracle-cnt-days-0">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="3">> 3 Days <span class="oracle-count-tag oracle-cnt-days-3">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="7">> 1 Week <span class="oracle-count-tag oracle-cnt-days-7">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="14">> 2 Weeks <span class="oracle-count-tag oracle-cnt-days-14">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="21">> 3 Weeks <span class="oracle-count-tag oracle-cnt-days-21">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="30">> 1 Month <span class="oracle-count-tag oracle-cnt-days-30">0</span></button>
          <button type="button" class="oracle-filter-btn oracle-days-btn" data-days="90">> 3 Months <span class="oracle-count-tag oracle-cnt-days-90">0</span></button>
        </div>

        <div class="oracle-filter-counter-badge">
          Showing <span class="oracle-filter-count-visible">0</span> of <span class="oracle-filter-count-total">0</span> Ads
        </div>
      </div>

      <div class="oracle-hunt-footprints">
        <span class="oracle-footprint-label">D2C Footprints:</span>
        ${INDIAN_FOOTPRINTS.map(fp => `
          <button type="button" class="oracle-chip" data-query='${fp.query}'>
            🎯 ${fp.label}
          </button>
        `).join('')}
      </div>
    `;

    document.body.prepend(bar);

    // Event Listeners for Hunt Bar buttons
    bar.querySelectorAll('.oracle-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const query = e.currentTarget.getAttribute('data-query');
        injectSearchQuery(query);
      });
    });

    document.getElementById('oracle-btn-open-sidebar').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });
    document.getElementById('oracle-btn-open-admin').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const adminUrl = (state.serverBaseUrl || 'http://localhost:3000').replace(/\/+$/, '') + '/admin';
      window.open(adminUrl, '_blank');
    });

    const filterBtn = document.getElementById('oracle-toggle-filter');
    filterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.settings.exclusionEngineEnabled = !state.settings.exclusionEngineEnabled;
      filterBtn.classList.toggle('active', state.settings.exclusionEngineEnabled);
      reapplyFilters();
    });

    bindFilterControls(bar);
  }

  // --------------------------------------------------------------------------
  // 1B. IN-GRID FILTER TOOLBAR (Directly above the Meta Ad Cards Grid)
  // --------------------------------------------------------------------------
  function locateGridFilterTarget() {
    // 1. Primary Strategy: Find the applied filter pill (e.g., "Active status: Active ads")
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let activeStatusNode = null;
    while (walker.nextNode()) {
      const val = walker.currentNode.nodeValue;
      if (val && (val.includes('Active status') || val.includes('Active ads'))) {
        activeStatusNode = walker.currentNode;
        break;
      }
    }

    if (activeStatusNode) {
      // Find the pill element (the container that has the '✕' or close button)
      let pillEl = activeStatusNode.parentElement;
      while (pillEl && pillEl !== document.body) {
        if (pillEl.textContent.includes('✕') || pillEl.textContent.includes('×') || pillEl.getAttribute('role') === 'button') {
          break;
        }
        if (pillEl.parentElement && pillEl.parentElement.offsetWidth > 400) {
          break;
        }
        pillEl = pillEl.parentElement;
      }

      if (pillEl && pillEl.parentElement) {
        let rowEl = pillEl.parentElement;
        while (rowEl && rowEl !== document.body && rowEl.offsetWidth < 350) {
          rowEl = rowEl.parentElement;
        }
        if (rowEl && rowEl !== document.body) {
          return {
            type: 'pill-row',
            row: rowEl,
            pill: pillEl
          };
        }
      }
    }

    // 2. Secondary Strategy: Find "Filters" or "Sort by" controls row
    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const sortOrFilter = allButtons.find(b => {
      const t = (b.textContent || '').trim();
      return t === 'Filters' || t.startsWith('Filters') || t.startsWith('Sort by');
    });

    if (sortOrFilter) {
      let headerRow = sortOrFilter.parentElement;
      while (headerRow && headerRow !== document.body && headerRow.offsetWidth < 400) {
        headerRow = headerRow.parentElement;
      }
      if (headerRow && headerRow.parentElement) {
        return {
          type: 'header-after',
          parent: headerRow.parentElement,
          ref: headerRow.nextSibling
        };
      }
    }

    // 3. Fallback: Find common ancestor of the ad cards grid
    const cards = document.querySelectorAll('[data-oracle-processed="true"]');
    if (cards.length > 0) {
      let gridRoot = cards[0].parentElement;
      if (cards.length >= 2) {
        let p = cards[0].parentElement;
        while (p && p !== document.body && !p.contains(cards[1])) {
          p = p.parentElement;
        }
        if (p && p !== document.body) gridRoot = p;
      }
      if (gridRoot && gridRoot.parentElement) {
        return {
          type: 'grid-before',
          parent: gridRoot.parentElement,
          ref: gridRoot
        };
      }
    }

    return null;
  }

  function mountGridFilterToolbar() {
    let toolbar = document.getElementById('oracle-grid-filter-toolbar');
    const target = locateGridFilterTarget();
    if (!target) return;

    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'oracle-grid-filter-toolbar';
      toolbar.className = 'oracle-grid-filter-bar';
      toolbar.innerHTML = `
        <div class="oracle-toolbar-left-cluster">
          <!-- Media Type Group -->
          <div class="oracle-pill-group">
            <span class="oracle-group-label">🎬 Media:</span>
            <button type="button" class="oracle-filter-btn oracle-media-btn ${state.filters.mediaType === 'all' ? 'active' : ''}" data-media="all" title="Show all creative media formats">
              All Media <span class="oracle-count-tag oracle-cnt-media-all">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-media-btn ${state.filters.mediaType === 'video' ? 'active' : ''}" data-media="video" title="Show video ads only">
              🎥 Videos Only <span class="oracle-count-tag oracle-cnt-media-video">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-media-btn ${state.filters.mediaType === 'image' ? 'active' : ''}" data-media="image" title="Show static image ads only">
              🖼️ Images Only <span class="oracle-count-tag oracle-cnt-media-image">0</span>
            </button>
          </div>

          <div class="oracle-group-divider"></div>

          <!-- Lifespan Threshold Group -->
          <div class="oracle-pill-group">
            <span class="oracle-group-label">⏱️ Active:</span>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 0 ? 'active' : ''}" data-days="0" title="Show all ads regardless of running days">
              All Time <span class="oracle-count-tag oracle-cnt-days-0">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 3 ? 'active' : ''}" data-days="3" title="Show ads active for more than 3 days">
              > 3 Days <span class="oracle-count-tag oracle-cnt-days-3">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 7 ? 'active' : ''}" data-days="7" title="Show ads active for at least 1 week (7+ days)">
              > 1 Week <span class="oracle-count-tag oracle-cnt-days-7">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 14 ? 'active' : ''}" data-days="14" title="Show proven winner ads active for at least 2 weeks (14+ days)">
              > 2 Weeks <span class="oracle-count-tag oracle-cnt-days-14">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 21 ? 'active' : ''}" data-days="21" title="Show ads active for at least 3 weeks (21+ days)">
              > 3 Weeks <span class="oracle-count-tag oracle-cnt-days-21">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 30 ? 'active' : ''}" data-days="30" title="Show scaling winner ads active for at least 1 month (30+ days)">
              > 1 Month <span class="oracle-count-tag oracle-cnt-days-30">0</span>
            </button>
            <button type="button" class="oracle-filter-btn oracle-days-btn ${state.filters.minDaysActive === 90 ? 'active' : ''}" data-days="90" title="Show evergreen winner ads active for at least 3 months (90+ days)">
              > 3 Months <span class="oracle-count-tag oracle-cnt-days-90">0</span>
            </button>
          </div>
        </div>

        <!-- Telemetry & Reset Controls -->
        <div class="oracle-telemetry-badge-group">
          <div class="oracle-live-match-badge">
            Showing <span class="oracle-filter-count-visible">0</span> of <span class="oracle-filter-count-total">0</span> Ads
          </div>
          <button type="button" class="oracle-reset-filter-btn" id="oracle-btn-reset-filters" title="Reset all filters to All Media & All Time">
            ↺ Reset
          </button>
        </div>
      `;

      bindFilterControls(toolbar);
    }

    // Mount or reposition
    if (target.type === 'pill-row') {
      if (toolbar.parentElement !== target.row) {
        target.row.style.display = 'flex';
        target.row.style.alignItems = 'center';
        target.row.style.justifyContent = 'space-between';
        target.row.style.flexWrap = 'wrap';
        target.row.style.gap = '8px';
        toolbar.style.flex = '1';
        toolbar.style.minWidth = '280px';

        let insertAnchor = target.pill;
        while (insertAnchor && insertAnchor.parentElement !== target.row) {
          insertAnchor = insertAnchor.parentElement;
        }
        target.row.insertBefore(toolbar, insertAnchor || target.row.firstChild);
      }
    } else if (target.type === 'header-after') {
      if (toolbar.parentElement !== target.parent) {
        target.parent.insertBefore(toolbar, target.ref);
      }
    } else if (target.type === 'grid-before') {
      if (toolbar.parentElement !== target.parent) {
        target.parent.insertBefore(toolbar, target.ref);
      }
    }

    updateFilterCounts();
  }

  // Live count evaluator for filter button badges
  function updateFilterCounts() {
    const cards = Array.from(document.querySelectorAll('[data-oracle-processed="true"]'));
    const total = cards.length;

    let videoCount = 0;
    let imageCount = 0;
    let d3 = 0, d7 = 0, d14 = 0, d21 = 0, d30 = 0, d90 = 0;

    cards.forEach(card => {
      if (card.dataset.oracleExcluded === 'true' && state.settings.exclusionEngineEnabled) {
        return;
      }
      const media = card.dataset.oracleMediaType || 'image';
      const days = parseInt(card.dataset.oracleDaysActive, 10) || 1;

      if (media === 'video') videoCount++;
      else imageCount++;

      if (days >= 3) d3++;
      if (days >= 7) d7++;
      if (days >= 14) d14++;
      if (days >= 21) d21++;
      if (days >= 30) d30++;
      if (days >= 90) d90++;
    });

    const setTxt = (sel, val) => {
      document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
    };

    setTxt('.oracle-cnt-media-all', total);
    setTxt('.oracle-cnt-media-video', videoCount);
    setTxt('.oracle-cnt-media-image', imageCount);

    setTxt('.oracle-cnt-days-0', total);
    setTxt('.oracle-cnt-days-3', d3);
    setTxt('.oracle-cnt-days-7', d7);
    setTxt('.oracle-cnt-days-14', d14);
    setTxt('.oracle-cnt-days-21', d21);
    setTxt('.oracle-cnt-days-30', d30);
    setTxt('.oracle-cnt-days-90', d90);
  }

  // Bind two-way synchronized filter controls across toolbars
  function bindFilterControls(container) {
    // Media Type filter buttons
    container.querySelectorAll('.oracle-media-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const media = e.currentTarget.getAttribute('data-media');
        state.filters.mediaType = media;

        // Sync active state across all media buttons on page (both Hunt Bar & Grid Toolbar)
        document.querySelectorAll('.oracle-media-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-media') === media);
        });

        applyCardFilters();
        updateFilterCounts();
      });
    });

    // Lifespan Duration filter buttons
    container.querySelectorAll('.oracle-days-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const days = parseInt(e.currentTarget.getAttribute('data-days'), 10) || 0;
        state.filters.minDaysActive = days;

        // Sync active state across all days buttons on page
        document.querySelectorAll('.oracle-days-btn').forEach(b => {
          const bDays = parseInt(b.getAttribute('data-days'), 10) || 0;
          b.classList.toggle('active', bDays === days);
        });

        applyCardFilters();
        updateFilterCounts();
      });
    });

    const resetBtn = container.querySelector('#oracle-btn-reset-filters, .oracle-btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.filters.mediaType = 'all';
        state.filters.minDaysActive = 0;
        document.querySelectorAll('.oracle-media-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-media') === 'all');
        });
        document.querySelectorAll('.oracle-days-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-days') === '0');
        });
        applyCardFilters();
        updateFilterCounts();
      });
    }
  }

  // Live filter evaluator for ad cards
  function applyCardFilters() {
    const cards = document.querySelectorAll('[data-oracle-processed="true"]');
    let visibleCount = 0;
    let totalCount = cards.length;

    cards.forEach(card => {
      // Respect FMCG / B2B exclusion
      if (card.dataset.oracleExcluded === 'true' && state.settings.exclusionEngineEnabled) {
        card.style.display = 'none';
        return;
      }

      const cardMedia = card.dataset.oracleMediaType || 'image';
      const cardDays = parseInt(card.dataset.oracleDaysActive, 10) || 1;

      let matchMedia = true;
      if (state.filters.mediaType === 'video' && cardMedia !== 'video') matchMedia = false;
      if (state.filters.mediaType === 'image' && cardMedia !== 'image') matchMedia = false;

      let matchDays = true;
      if (cardDays < state.filters.minDaysActive) matchDays = false;

      if (matchMedia && matchDays) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Update counter badges across Hunt Bar and Grid Toolbar
    document.querySelectorAll('.oracle-filter-count-visible').forEach(el => el.textContent = visibleCount);
    document.querySelectorAll('.oracle-filter-count-total').forEach(el => el.textContent = totalCount);
  }

  // Inject search footprint into Meta Ads Library input
  function injectSearchQuery(query) {
    const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder*="search" i]');
    let targetInput = null;

    for (const input of searchInputs) {
      if (input.offsetWidth > 150) {
        targetInput = input;
        break;
      }
    }

    if (targetInput) {
      targetInput.focus();
      targetInput.value = query;

      // Dispatch standard React / DOM events
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Trigger Enter key
      targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

      console.log(`[Ad Oracle] Injected search footprint: ${query}`);
    } else {
      // Fallback: reload with URL search param if input not found
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('q', query);
      window.location.href = currentUrl.toString();
    }
  }

  // --------------------------------------------------------------------------
  // 2. AI KEYWORD HUNTER DRAWER (SIDEBAR)
  // --------------------------------------------------------------------------
  function mountSidebarDrawer() {
    if (document.getElementById('oracle-sidebar-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'oracle-sidebar-drawer';
    drawer.innerHTML = `
      <div class="oracle-drawer-header">
        <div class="oracle-drawer-title">
          <span>🎯</span> AI Dropshipping Footprint Hunter
        </div>
        <button class="oracle-drawer-close" id="oracle-drawer-close-btn">&times;</button>
      </div>
      <div class="oracle-drawer-content">
        <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
          Select high-converting footprints tailored for the Indian D2C dropshipping ecosystem. Clicking any footprint auto-injects it into the Meta Ads search bar.
        </p>
        ${NICHE_FOOTPRINTS.map(niche => `
          <div class="oracle-niche-card">
            <div class="oracle-niche-header">${niche.category}</div>
            <div class="oracle-niche-desc">${niche.description}</div>
            <div class="oracle-niche-queries">
              ${niche.queries.map(q => `
                <span class="oracle-query-tag" data-query='${q}'>${q.replace(/"/g, '')}</span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(drawer);

    document.getElementById('oracle-drawer-close-btn').addEventListener('click', toggleSidebar);

    drawer.querySelectorAll('.oracle-query-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        const query = e.currentTarget.getAttribute('data-query');
        injectSearchQuery(query);
        toggleSidebar();
      });
    });
  }

  function mountSidebarTab() {
    if (document.getElementById('oracle-sidebar-tab')) return;

    const tab = document.createElement('div');
    tab.id = 'oracle-sidebar-tab';
    tab.textContent = 'AI FOOTPRINTS';
    tab.addEventListener('click', toggleSidebar);
    document.body.appendChild(tab);
  }

  function toggleSidebar() {
    const drawer = document.getElementById('oracle-sidebar-drawer');
    if (drawer) {
      drawer.classList.toggle('open');
    }
  }

  // --------------------------------------------------------------------------
  // 3. CORE AD CARD DETECTION & INTERCEPTION (Anti-Scramble Engine)
  // --------------------------------------------------------------------------
  function scanAndProcessAds() {
    // Locate elements containing "Library ID:" or "ID:" text nodes
    const textWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeValue && (node.nodeValue.includes('Library ID:') || node.nodeValue.includes('Started running on') || node.nodeValue.includes('Launched in'))) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const anchorNodes = [];
    while (textWalker.nextNode()) {
      anchorNodes.push(textWalker.currentNode);
    }

    anchorNodes.forEach(node => {
      const card = findAdCardContainer(node.parentElement);
      if (card && !card.dataset.oracleProcessed) {
        card.dataset.oracleProcessed = 'true';
        processAdCard(card);
      }
    });

    mountGridFilterToolbar();
    updateFilterCounts();
    applyCardFilters();
    updateTelemetryBadges();
  }

  // Climb up parent hierarchy to locate enclosing ad card container
  function findAdCardContainer(el) {
    let current = el;
    let candidate = null;
    let depth = 0;

    while (current && depth < 16 && current !== document.body) {
      const parent = current.parentElement;
      if (!parent || parent === document.body) break;

      // Stop if parent is a search/navigation wrapper or our injected headers
      if (parent.id === 'oracle-hunt-bar' || parent.id === 'oracle-grid-filter-toolbar' ||
          parent.querySelector('#oracle-hunt-bar, #oracle-grid-filter-toolbar, input[type="search"]')) {
        candidate = current;
        break;
      }

      // Check how many "Library ID:" occurrences exist in the parent
      const parentText = parent.textContent || '';
      const idMatches = parentText.match(/Library ID:\s*\d+/gi) || parentText.match(/Library ID:/gi) || [];

      // If the parent contains multiple ads, current is the exact isolated card!
      if (idMatches.length > 1) {
        candidate = current;
        break;
      }

      // Check if current has the essential signatures of an ad card
      const text = current.textContent || '';
      const hasId = text.includes('Library ID:') || text.includes('ID:');
      const hasDate = text.includes('Started running on') || text.includes('Launched in');
      const hasMedia = current.querySelector('img, video') !== null;

      if (hasId && hasDate && hasMedia) {
        candidate = current;
      }

      current = parent;
      depth++;
    }

    return candidate || el;
  }

  // Process an individual ad card
  function processAdCard(card) {
    state.totalProcessed++;
    const cardText = card.innerText || card.textContent || '';

    // 1. Extract Ad ID
    const idMatch = cardText.match(/Library ID:\s*(\d+)/i) || cardText.match(/ID:\s*(\d+)/i);
    const adId = idMatch ? idMatch[1] : `ad_${Math.floor(Math.random() * 8999999999 + 1000000000)}`;

    // 2. Extract Date & Compute Lifespan
    const dateMatch = cardText.match(/Started running on\s*([A-Za-z0-9, ]+)/i) ||
                      cardText.match(/Launched in\s*([A-Za-z0-9, ]+)/i);
    const startDateStr = dateMatch ? dateMatch[1].trim() : '';
    const daysActive = calculateDaysActive(startDateStr);

    // 3. Extract Brand Name & Page Likes
    const brandInfo = extractBrandInfo(card);

    // 4. Extract Landing Page & Outbound Destination
    const landingInfo = extractLandingPageInfo(card);

    // 5. Extract Ad Copy
    const adCopy = extractAdCopy(card);

    // 6. Extract Creative Media URL
    const mediaUrl = extractMediaUrl(card);

    // ------------------------------------------------------------------------
    // 4. EXCLUSION ENGINE: Filter High-Like FMCG & Corporate B2B Ads
    // ------------------------------------------------------------------------
    const isExcluded = checkExclusion({
      pageLikes: brandInfo.likesNumber,
      brand: brandInfo.brandName,
      adCopy,
      isEcommerce: landingInfo.isEcommerce
    });

    if (isExcluded) {
      state.filteredCount++;
      card.dataset.oracleExcluded = 'true';
      if (state.settings.exclusionEngineEnabled) {
        applyExclusionCollapse(card, brandInfo, adId);
        return; // Skip further processing if excluded
      }
    }

    // ------------------------------------------------------------------------
    // 5. TRAFFIC LIGHT EVALUATION: Winner (>14d), Testing (5-13d), Volatile (<4d)
    // ------------------------------------------------------------------------
    let status = 'Volatile';
    let statusClass = 'oracle-card-volatile';
    let pillClass = 'oracle-pill-volatile';
    let pillText = `Volatile ⚠️ (${daysActive}d)`;

    if (daysActive >= 14) {
      status = 'Winner';
      statusClass = 'oracle-card-winner';
      pillClass = 'oracle-pill-winner';
      pillText = `Winner 🔥 (${daysActive}d)`;
      state.winnersCount++;
    } else if (daysActive >= 5) {
      status = 'Testing';
      statusClass = 'oracle-card-testing';
      pillClass = 'oracle-pill-testing';
      pillText = `Testing ⚡ (${daysActive}d)`;
      state.testingCount++;
    } else {
      state.volatileCount++;
    }

    if (state.settings.trafficLightEnabled) {
      card.classList.add(statusClass);
    }

    // ------------------------------------------------------------------------
    // Detect Media Type (Video vs Image)
    // ------------------------------------------------------------------------
    // 1. Direct HTML5 video player or sources
    const hasVideoEl = card.querySelector('video') !== null;
    const hasVideoSource = card.querySelector('video source, video[src], video[poster]') !== null;

    // 2. Dedicated play button overlay or player indicators
    const hasPlayBtn = card.querySelector('div[data-video-id], div[data-sigil*="inlineVideo"], [aria-label="Play video" i], [aria-label="Play Video" i], button[aria-label="Play" i]') !== null;

    // 3. Standalone video duration badge (leaf element with text strictly matching "0:15", "1:30", etc.)
    let hasDurationBadge = false;
    const candidateBadges = card.querySelectorAll('span, div');
    for (const badge of candidateBadges) {
      if (badge.children.length === 0) {
        const text = badge.textContent.trim();
        if (/^\d{1,2}:\d{2}$/.test(text) && text.length <= 6) {
          hasDurationBadge = true;
          break;
        }
      }
    }

    const isVideo = hasVideoEl || hasVideoSource || hasPlayBtn || hasDurationBadge;
    const mediaType = isVideo ? 'video' : 'image';
    const mediaBadge = isVideo ? '🎥 Video' : '🖼️ Image';

    // Store attributes for instant live client-side filtering
    card.dataset.oracleMediaType = mediaType;
    card.dataset.oracleDaysActive = String(daysActive);
    card.dataset.oracleStatus = status;

    // ------------------------------------------------------------------------
    // 6. INJECT HEADER BADGE (Status Pill + Days Active + Media Badge + Ad ID)
    // ------------------------------------------------------------------------
    const badgeHeader = document.createElement('div');
    badgeHeader.className = 'oracle-badge-header';
    badgeHeader.innerHTML = `
      <div class="oracle-badge-left">
        <span class="oracle-badge-pill ${pillClass}">${pillText}</span>
        <span class="oracle-days-count">${daysActive} Days Running</span>
        <span class="oracle-badge-media">${mediaBadge}</span>
        <span class="oracle-start-date">• ${startDateStr || 'Recent'}</span>
      </div>
      <div style="font-size: 10px; color: #6B7280; font-family: monospace;">
        #${adId}
      </div>
    `;
    card.prepend(badgeHeader);

    // ------------------------------------------------------------------------
    // 7. INJECT CLEAN ACTION FOOTER (SAVE TO VAULT & PLATFORM BADGE)
    // ------------------------------------------------------------------------
    const cardFooter = document.createElement('div');
    cardFooter.className = 'oracle-card-injected-footer';

    // Action Row (Save to Vault + Platform Badge)
    const actionRow = document.createElement('div');
    actionRow.className = 'oracle-card-actions';
    actionRow.innerHTML = `
      <div style="display:flex; align-items:center; gap: 6px;">
        <button type="button" class="oracle-save-btn" id="save-btn-${adId}">
          💾 Save to Vault
        </button>
        <span class="oracle-store-detect-badge">
          🛒 ${landingInfo.platform || 'Store'}
        </span>
      </div>
      <div style="font-size: 10px; color: #9CA3AF;">
        Likes: <strong style="color:#FFF;">${brandInfo.likesRaw || 'N/A'}</strong>
      </div>
    `;

    cardFooter.appendChild(actionRow);
    card.appendChild(cardFooter);

    // Bind "Save to Vault" button
    const saveBtn = actionRow.querySelector(`#save-btn-${adId}`);
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const payload = {
        id: adId,
        brand: brandInfo.brandName,
        pageLikes: brandInfo.likesRaw,
        startDate: startDateStr,
        daysActive,
        status,
        mediaType,
        adCopy,
        mediaUrl,
        landingPage: landingInfo.url,
        platform: landingInfo.platform,
        rtoMetrics: {
          sellingPrice: 1299,
          sourcingCost: 350,
          rtoRate: 30,
          breakevenRoas: '2.44',
          netMarginPerDelivered: 580
        }
      };

      saveBtn.textContent = '⏳ Saving...';
      saveBtn.style.opacity = '0.7';

      chrome.runtime.sendMessage({ action: 'SAVE_AD_TO_VAULT', payload }, (response) => {
        if (response && response.success) {
          saveBtn.innerHTML = '✓ Vaulted (DB)';
          saveBtn.className = 'oracle-save-btn saved';
          saveBtn.style.opacity = '1';
        } else {
          const errMsg = response && response.error ? response.error : 'Server offline';
          saveBtn.innerHTML = '⚠️ Server Offline';
          saveBtn.title = `Failed to connect to ${state.serverBaseUrl || 'http://localhost:3000'}: ${errMsg}`;
          saveBtn.style.opacity = '1';
          console.error('[Ad Oracle] Vault save error:', errMsg);
          setTimeout(() => {
            saveBtn.innerHTML = '💾 Save to Vault';
          }, 4000);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // HELPER EXTRACTION UTILITIES
  // --------------------------------------------------------------------------
  function calculateDaysActive(dateStr) {
    if (!dateStr) return 1;
    try {
      const parsed = Date.parse(dateStr);
      if (isNaN(parsed)) return 1;
      const diffMs = Date.now() - parsed;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(1, days);
    } catch (e) {
      return 1;
    }
  }

  function extractBrandInfo(card) {
    const text = card.innerText || '';
    // Look for page likes/followers
    const likesMatch = text.match(/([\d,.]+[KkMm]?)\s*(?:likes|followers)/i);
    let likesRaw = likesMatch ? likesMatch[0] : '';
    let likesNumber = 0;

    if (likesMatch) {
      let numStr = likesMatch[1].replace(/,/g, '');
      if (numStr.toLowerCase().endsWith('k')) {
        likesNumber = parseFloat(numStr) * 1000;
      } else if (numStr.toLowerCase().endsWith('m')) {
        likesNumber = parseFloat(numStr) * 1000000;
      } else {
        likesNumber = parseFloat(numStr) || 0;
      }
    }

    // Try finding brand name link or header
    let brandName = 'Competitor Brand';
    const potentialLinks = card.querySelectorAll('a[role="link"], strong, h3, span');
    for (const el of potentialLinks) {
      const str = el.textContent.trim();
      if (str.length > 2 && str.length < 50 && !str.includes('Library') && !str.includes('Sponsored') && !str.includes('Active')) {
        brandName = str;
        break;
      }
    }

    return { brandName, likesRaw, likesNumber };
  }

  function extractLandingPageInfo(card) {
    const links = card.querySelectorAll('a[href]');
    let url = '';
    let platform = 'Shopify';

    for (const a of links) {
      const href = a.href || '';
      // Decode Facebook redirect wrapper (l.facebook.com/l.php?u=...)
      if (href.includes('facebook.com/l.php') || href.includes('fb.me')) {
        try {
          const parsed = new URL(href);
          const dest = parsed.searchParams.get('u');
          if (dest) {
            url = decodeURIComponent(dest);
            break;
          }
        } catch (e) {}
      } else if (!href.includes('facebook.com') && !href.includes('instagram.com') && href.startsWith('http')) {
        url = href;
        break;
      }
    }

    if (url.includes('myshopify') || url.includes('/products/') || url.includes('/collections/')) {
      platform = 'Shopify';
    } else if (url.includes('wp-content') || url.includes('woocommerce') || url.includes('/shop/')) {
      platform = 'WooCommerce';
    } else if (url) {
      platform = 'Custom Ecom';
    }

    const isEcommerce = Boolean(url && (platform === 'Shopify' || platform === 'WooCommerce' || url.includes('cart') || url.includes('checkout') || url.includes('shop')));

    return { url, platform, isEcommerce };
  }

  function extractAdCopy(card) {
    const textNodes = [];
    const elements = card.querySelectorAll('div, p, span');
    for (const el of elements) {
      if (el.children.length === 0) {
        const t = el.textContent.trim();
        if (t.length > 25 && !t.includes('Library ID') && !t.includes('Started running on')) {
          textNodes.push(t);
        }
      }
    }
    return textNodes.slice(0, 3).join(' ') || 'Visual Creative Ad';
  }

  function extractMediaUrl(card) {
    const img = card.querySelector('img[src^="http"]');
    if (img && img.naturalWidth > 100) return img.src;

    const video = card.querySelector('video');
    if (video) return video.poster || video.src || '';

    return img ? img.src : '';
  }

  function checkExclusion({ pageLikes, brand, adCopy, isEcommerce }) {
    // 1. Check Likes > 100,000
    if (pageLikes > state.settings.maxPageLikes) {
      return true;
    }

    // 2. Check Corporate / B2B Keywords
    const fullText = `${brand} ${adCopy}`.toLowerCase();
    const hasB2BKeyword = CORPORATE_B2B_KEYWORDS.some(kw => fullText.includes(kw));
    if (hasB2BKeyword) {
      return true;
    }

    return false;
  }

  function applyExclusionCollapse(card, brandInfo, adId) {
    card.style.display = 'none';

    // Insert compact restore ribbon
    const ribbon = document.createElement('div');
    ribbon.className = 'oracle-excluded-wrapper';
    ribbon.id = `excluded-ribbon-${adId}`;
    ribbon.innerHTML = `
      <span>🛡️ [FILTERED] Corporate / High-Like Ad (${brandInfo.brandName} • ${brandInfo.likesRaw || 'B2B'})</span>
      <button class="oracle-restore-btn" id="restore-btn-${adId}">Show Anyway</button>
    `;

    card.parentNode.insertBefore(ribbon, card);

    ribbon.querySelector(`#restore-btn-${adId}`).addEventListener('click', () => {
      card.style.display = 'block';
      ribbon.remove();
    });
  }

  function reapplyFilters() {
    const ribbons = document.querySelectorAll('.oracle-excluded-wrapper');
    const excludedCards = document.querySelectorAll('[data-oracle-excluded="true"]');

    if (!state.settings.exclusionEngineEnabled) {
      // Unhide all
      ribbons.forEach(r => r.style.display = 'none');
      excludedCards.forEach(c => c.style.display = 'block');
    } else {
      // Re-hide
      ribbons.forEach(r => r.style.display = 'flex');
      excludedCards.forEach(c => {
        if (c.previousElementSibling && c.previousElementSibling.classList.contains('oracle-excluded-wrapper')) {
          c.style.display = 'none';
        }
      });
    }
  }

  function updateTelemetryBadges() {
    const winEl = document.getElementById('oracle-stat-winners');
    const testEl = document.getElementById('oracle-stat-testing');
    const filtEl = document.getElementById('oracle-stat-filtered');

    if (winEl) winEl.textContent = state.winnersCount;
    if (testEl) testEl.textContent = state.testingCount;
    if (filtEl) filtEl.textContent = state.filteredCount;

    // Send winner count to extension badge
    chrome.runtime.sendMessage({
      action: 'UPDATE_BADGE',
      winnerCount: state.winnersCount
    });
  }

})();
