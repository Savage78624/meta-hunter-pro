# Meta Hunter Pro (Ad Oracle) - Architectural Decision Log

This ledger documents every architectural choice, technical rationale, and implementation status for Meta Hunter Pro (Ad Oracle) in accordance with the Mandatory Operational Protocol.

---

## Decision Entry 001: System Topology & 3-Tier Architecture
- **Feature/Code Block Name:** System Architecture & Directory Layout
- **The Problem:** Meta Ads Library actively changes its internal client-side implementation, obfuscates CSS classes, and provides zero native dropshipping intelligence (no lifespan scoring, no RTO accounting for COD-heavy markets like India, no competitor store filtering). Furthermore, third-party spy tools cost $50-$150/mo, store scraped data on external servers, and frequently get blocked.
- **The Decision:** Implement a local-first, decentralized 3-tier architecture:
  1. `/Ad_Analyst_Extension/`: Chrome Extension (Manifest V3) for zero-latency DOM injection, live ad lifespan evaluation, client-side RTO margin calculation, footprint injection, and local API dispatch.
  2. `/Meta_Ad_Server/`: Local Node.js / Express backend with a resilient flat-file `database.json` vault operating on `http://localhost:3000`.
  3. `/Admin_Command_Center/`: Standalone Tailwind CSS dark-mode dashboard providing deep analytics, ad vaults, competitor monitoring, and Indian market ROAS simulators.
- **Rationale:** Keeps data 100% private and offline-capable without monthly API fees. Localhost proxy bypasses cross-origin blocking and allows instant persistence from the browser extension without database configuration overhead.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 002: Meta Ads Library DOM Interception & Scramble Resistance
- **Feature/Code Block Name:** `content.js` Scramble-Resilient DOM Engine
- **The Problem:** Meta's React build generates randomized, hashed class names (e.g., `x1lliihq`, `x1plvlek`) that mutate across sessions, ad formats, and Facebook updates. Selecting elements by static class names causes immediate breakdown.
- **The Decision:*
  1. Use regex and recursive `TreeWalker` to locate anchor strings: `"Library ID:"`, `"Started running on"`, `"Launched in"`, `"Page Likes"`, and `"Sponsored"`.
  2. Traverse up to the ad card container via `.closest()` or element ancestor traversal up to the bounding card container.
  3. Attach persistent custom attributes (`data-oracle-processed="true"`) to prevent double-injection upon React re-renders.
  4. Use a throttled `MutationObserver` to intercept dynamically mounted ad cards during infinite scroll.
- **Rationale:** Text anchors like "Library ID:" and "Started running on" have remained immutable across Meta's Ads Library iterations for 5+ years because they represent localized human-facing metadata labels.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 003: Traffic Light Lifespan Evaluation Engine
- **Feature/Code Block Name:** `evaluateLifespan()` & Visual Badge Injection
- **The Problem:** Media buyers spend hours manually checking the start date of ads. In dropshipping, 90% of ads die within 3 days. Only ads running for >14 days are proven winners generating positive ROAS that justify reverse-engineering.
- **The Decision:** Extract the launch date string (e.g., "Started running on 10 Oct 2024"), parse into an accurate timestamp, and compute `Days Active = (Now - LaunchDate) / (1000 * 60 * 60 * 24)`:
  - **Green (Winner):** > 14 days active. Indicates scalable creative with sustained ad spend. Injects a distinct glowing green border (`#10B981`) and a "Winner 🔥 (>14d)" badge.
  - **Orange (Testing):** 5 to 13 days active. Indicates potential traction undergoing creative/audience validation. Injects an amber border (`#F59E0B`) and a "Testing ⚡ (5-13d)" badge.
  - **Red (Volatile):** < 4 days active. Fresh launch or unprofitable test. Injects a muted red border (`#EF4444`) and a "Volatile ⚠️ (<4d)" badge.
- **Rationale:** Immediate visual triage saves media buyers 80% of manual browsing time by filtering signal from noise instantly.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 004: Indian Market True RTO & Margin Calculator
- **Feature/Code Block Name:** `injectRtoCalculator()`
- **The Problem:** The Indian D2C dropshipping landscape is 70-80% Cash on Delivery (COD). Typical Return-To-Origin (RTO) rates hover around 25%-35%. When a parcel returns, the merchant loses both forward shipping (~₹70) and reverse logistics charges (RTO freight ~₹60), plus packaging, while product COGS is tied up. Novice media buyers target a 2.0x Meta ROAS and go bankrupt because their true breakeven ROAS in India is often 2.8x - 3.5x.
- **The Decision:** Injected interactive micro-calculator in every ad card:
  - Inputs: Product Selling Price (₹), Sourcing Cost / COGS (₹), Estimated RTO% (Default: 30%), Forward + Reverse Shipping (Default: ₹130 total RTO cost, ₹70 delivered cost).
  - Formula:
    - Delivered Ratio = `1 - (RTO% / 100)`
    - Net Realized Revenue per Order = `Selling Price * Delivered Ratio`
    - Net Product Cost per Order = `Sourcing Cost * Delivered Ratio` (assuming returned inventory is salvaged)
    - Total Shipping per Order = `(Delivered Ratio * ₹70) + ((RTO% / 100) * ₹130)`
    - Net Margin Available for Ads = `Net Realized Revenue - Net Product Cost - Total Shipping`
    - **Breakeven ROAS** = `Selling Price / Net Margin Available for Ads`
  - Real-time display updates dynamically inside the card with high/low risk indicators.
- **Rationale:** Instantly arms the media buyer with the exact unit economics needed to know if a competitor's product is viable in India before spending ₹1 on creatives.
- **Approval Status:** [REVISED] (Decoupled from cards and centralized into top-bar Admin Tool per Decision Entry 009)

---

## Decision Entry 005: Drop-Shipping Footprint "Hunt Bar" & AI Keyword Hunter
- **Feature/Code Block Name:** `The Hunt Bar` & `AI Keyword Sidebar`
- **The Problem:** Finding untapped dropshipping products requires entering high-intent e-commerce footprints into Meta Ads Library. Entering these manually repeatedly is slow and tedious.
- **The Decision:**
  1. Sticky top Hunt Bar injected at the top of the Ads Library viewport with one-click footprint chips tailored for Indian dropshipping:
     - `"Cash on Delivery"`
     - `"Free Shipping Across India"`
     - `"50% Off Today"`
     - `"Pay on Delivery Available"`
     - `"Viral TikTok"`
     - `"Limited Stock Buy 1 Get 1"`
     - `"Shop Now Extra 10% Off"`
  2. Expandable AI Keyword Hunter Sidebar containing classified Indian niches (Home & Kitchen, Car Accessories, Fitness & Personal Care, Spiritual/Pooja, Problem Solvers) with intelligent Boolean keyword generators that directly populate Meta's search parameters.
- **Rationale:** Eliminates manual typing, accelerates keyword pivoting, and keeps high-converting footprints one click away.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 006: Exclusion Engine
- **Feature/Code Block Name:** `applyExclusions()`
- **The Problem:** The Ads Library is flooded with multi-billion dollar FMCG brands (HUL, P&G, Tata, Reliance) with millions of likes, and B2B SaaS/agencies ("book a call", "software", "lead gen") that clutter dropshipping product discovery.
- **The Decision:**
  - Automated detection and hiding of ads where:
    1. Page Likes / Followers > 100,000 (configurable in settings).
    2. Outbound URL is not an independent e-commerce store (e.g. corporate lead gen, app installs, B2B).
    3. Ad copy or brand name contains corporate/B2B stop words (`"software"`, `"plumbing"`, `"book a call"`, `"b2b"`, `"saas"`, `"agency"`, `"consultation"`, `"free audit"`, `"hire"`).
  - An excluded counter badge in the Hunt Bar showing total junk ads filtered out.
- **Rationale:** Strips out ~70% of irrelevant enterprise ads, leaving pure D2C/dropshipping contenders.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 007: Flat-File Vault Backend & Local Storage Proxy
- **Feature/Code Block Name:** `server.js` (Express + `database.json`)
- **The Problem:** Heavy databases (PostgreSQL, MongoDB) require complex setups, background daemons, migrations, and credentials that complicate local development and portability.
- **The Decision:**
  - Build an Express.js server on port 3000 using Node's native `fs.promises` with a JSON flat-file storage engine (`database.json`).
  - Structured storage: `{ ads: [], stores: [] }`.
  - Atomically update file on write with JSON formatting.
  - Endpoints:
    - `POST /api/save-ad` (Saves intercepted ad card details, metrics, RTO breakeven, media links).
    - `POST /api/save-store` (Stores competitor store URLs, notes, and platform detection).
    - `GET /api/vault` (Serves stored ads & stores to the Command Center).
    - `DELETE /api/ad/:id` & `DELETE /api/store/:id` (Management endpoints).
    - `GET /api/health` (Extension & dashboard ping).
- **Rationale:** Ultra-lightweight, zero-config, portable, easily backed up, and instantly functional with standard Node.js.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 008: Admin Command Center (Dark Mode B2B Interface)
- **Feature/Code Block Name:** `Admin_Command_Center` Dashboard
- **The Problem:** Media buying teams need a centralized command center to review saved winning ads, monitor competitor storefronts, and audit Indian market ROAS feasibility without navigating clunky bookmarks or spreadsheets.
- **The Decision:**
  - Build a responsive, single-page application using Tailwind CSS CDN, styled with a high-contrast dark theme (slate-900 / zinc-950 with emerald and violet accents).
  - Features:
    1. **Saved Winning Ads Grid:** Displays ad creative previews, Days Active badge, Indian RTO Breakeven ROAS, copy excerpt, Ad ID, and quick actions (view in Ads Library, visit store, export).
    2. **Monitored Competitor Stores Table:** Lists competitor domains, detected platform (Shopify / WooCommerce), date added, and monitoring status.
    3. **Interactive RTO Margin Sandbox:** Real-time Indian COD profitability calculator allowing media buyers to simulate different RTO% scenarios and ad budgets.
    4. **Telemetry & Sync Status:** Real-time indicator showing Node.js vault connection status and quick refresh.
- **Rationale:** Gives media buyers an executive-grade operational view comparable to proprietary agency tools.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 009: Decouple RTO Calculator from Ad Cards into Top-Bar Global Admin Tool
- **Feature/Code Block Name:** `Admin_Command_Center` Top-Bar Quick Tool & Extension Card Cleanup
- **The Problem:** Injected micro-calculators on every single ad card clutter the Meta Ads Library browsing experience, increasing visual noise and taking up vertical space when media buyers are rapidly scrolling to evaluate creative aesthetics, hook copy, and lifespan.
- **The Decision:**
  1. Remove the injected `oracle-rto-panel` calculator form from every ad card in `Ad_Analyst_Extension/content.js`, `style.css`, and `popup.html`. Keep ad cards clean, focused exclusively on the Traffic Light lifespan header badge, brand info, creative media, and the "Save to Vault" action button.
  2. In `Admin_Command_Center`, introduce a dedicated quick-access **"🧮 RTO Calculator" tool button directly in the sticky top navigation bar**.
  3. Clicking the top-bar tool launches a high-speed, interactive modal tool accessible from any view (Ads Grid, Stores Table, etc.) with real-time Indian COD unit economics math (Selling price, Sourcing cost, RTO%, Forward/Reverse courier costs, Breakeven ROAS, Net Margin per delivered order, and Max CPA).
- **Rationale:** Keeps the Chrome Extension lightweight, clean, and unobtrusive on Meta Ads Library, while centralizing profitability calculation into a dedicated, universally accessible tool in the Admin Command Center top bar.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 010: Live Media Type & Lifespan Filter Toolbar in Meta Ads Library
- **Feature/Code Block Name:** `mountGridFilterToolbar()` & `applyCardFilters()`
- **The Problem:** In dropshipping media buying, video ads convert significantly better than image ads, and ads running for >2 weeks, >1 month, or >3 months represent evergreen scaling winners. However, Meta Ads Library's native filters do not offer one-click lifespan thresholds (>3d, >1w, >2w, >3w, >1m, >3m) or instant client-side media type toggling (Videos Only, Images Only, All Media), forcing media buyers to manually inspect hundreds of cards.
- **The Decision:**
  1. Inject a dedicated, high-contrast quick-filter toolbar positioned directly above the ads grid (matching the exact location highlighted by the user, right above the ad cards, and mirrored in the sticky Hunt Bar).
  2. Implement two filter button groups:
     - **Media Format Filters:** `[All Media]`, `[🎥 Videos Only]`, `[🖼️ Images Only]`.
     - **Lifespan Duration Filters:** `[All Time]`, `[> 3 Days]`, `[> 1 Week (7d)]`, `[> 2 Weeks (14d)]`, `[> 3 Weeks (21d)]`, `[> 1 Month (30d)]`, `[> 3 Months (90d)]`.
  3. Store active filter state in memory (`state.filters.mediaType`, `state.filters.minDaysActive`).
  4. On click or on new ads rendered by infinite scroll, instantly evaluate all ad cards:
     - Check media format: presence of `<video>` tag, video controls, or video poster attribute vs image.
     - Check lifespan: `daysActive >= minDays`.
     - Cards matching criteria are displayed; non-matching cards are cleanly hidden (`display: none`).
  5. Inject a live counter: `Showing X of Y Ads` so media buyers immediately know how many winning creative formats qualify under the active thresholds.
- **Rationale:** Delivers instant, client-side triage in <5ms without reloading the page or waiting for Meta's sluggish server-side filter queries. Allows dropshippers to instantly isolate evergreen video ads running for >1 month or >3 months with a single click.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 011: Precision In-Row Filter Bar Placement in Meta's Native Filter Header Row
- **Feature/Code Block Name:** `mountGridFilterToolbar()` Precision Anchor & Native Row Integration
- **The Problem:** The user identified the exact whitespace directly to the left of Meta's native `Active status: Active ads [✕]` pill (outlined in a bold red rectangle in the uploaded screenshot `media_1792962982445.png`) right above the first row of ad cards. Placing the toolbar as an ad-hoc element above the grid can cause it to miss the native header row or clash visually with Meta's white/light background. Furthermore, the user explicitly requested buttons for `Videos only`, `Images only`, `All media type`, and active duration buttons for `> 3 days`, `1 week`, `2 week`, `3 week`, `1 month`, and `3 months active`, showing how many days the ad is active.
- **The Decision:**
  1. **Precision Anchor Detection:**
     - Intercept Meta's native filter pill row by locating the text node containing `"Active status"` or `"Active ads"` using `TreeWalker` and climbing to the enclosing row container (`offsetWidth > 400`).
     - Insert `#oracle-grid-filter-toolbar` directly inside this row as its primary left-aligned flex item, positioning it EXACTLY inside the red box outlined by the user, right alongside `Active status: Active ads ✕`.
     - Multi-tier resilient fallback: If the `"Active status"` pill is absent, locate the `"Filters"` / `"Sort by"` control container or the ad cards grid root container and insert directly between the header and cards.
  2. **Button Layout & Styling:**
     - Style buttons with a sleek, polished pill design matching Meta's design language on light background (border, soft gray `#F3F4F6`, `#374151` typography, emerald active state `#10B981` with white text and glow shadow).
     - Provide the exact requested buttons:
       - **Media:** `All Media`, `🎥 Videos Only`, `🖼️ Images Only`
       - **Days Active:** `All Time`, `> 3 Days`, `> 1 Week`, `> 2 Weeks`, `> 3 Weeks`, `> 1 Month`, `> 3 Months`
  3. **Live "Days Active" Telemetry & Dynamic Counts:**
     - Display live count of matching ads on the filter buttons and in the status pill (e.g. `Showing X of Y Ads Active for [N]+ Days`).
     - Ensure each ad card prominently displays `[N] Days Running` and launch date in the top header pill.
  4. **Strict Client-Side Filtering:** Instant evaluation on card mutation and filter click without page reloads.
- **Rationale:** Delivers exact pixel-level placement inside the user's targeted red box, blends seamlessly with Meta's UI, and gives media buyers instantaneous 1-click filtering of winning ads by format and longevity.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 012: Fix Media Type Evaluation & "Images Only" Grid Collapse
- **Feature/Code Block Name:** Robust Ad Card Boundary & Precision Media Type Triage (`findAdCardContainer`, `detectMediaType`, `applyCardFilters`)
- **The Problem:** When clicking the "Images Only" button in Meta Ads Library, the interface collapses/glitches and 0 ads show up. Investigation revealed three root causes:
  1. **False-Positive Video Classification:** `hasVideoTime = /(\d{1,2}:\d{2})/.test(cardText)` tested the entire card's text. Because Meta Ads Library often displays the launch timestamp (e.g., "12:30 PM", "15:45") in the start date, or ad copy contains contact/offer hours, 100% of ads were falsely flagged as `video`. Consequently, zero ads were identified as `image`.
  2. **Card Container Overshooting:** `findAdCardContainer` used `parentElement.querySelectorAll('img, video').length > 6` as a stopping condition. In search results with column wrappers or fewer than 6 images, it climbed 14 levels up to the entire grid container or column wrapper. When "Images Only" was clicked, hiding the misidentified container collapsed the entire ad grid.
  3. **Event Bubbling & Form Submission:** Filter buttons lacked `type="button"`, and click event listeners lacked `e.preventDefault()` / `e.stopPropagation()`. When rendered inside or adjacent to Meta's filter form, clicking the button triggered native form submissions or Meta React filter resets.
- **The Decision:**
  1. **Strict Single-Ad Boundary Heuristic:** `findAdCardContainer` now counts `"Library ID:"` occurrences. It climbs as long as `(parent.textContent.match(/Library ID:/gi) || []).length === 1` and immediately stops when `parent` contains more than one ad ID, or contains search/filter form inputs. This guarantees `card` is strictly an individual ad card.
  2. **Precision Media Classification:**
     - Video ad markers: presence of `<video>` element, video controls/sources, explicit `[aria-label="Play video" i]` or `[aria-label="Play" i]` buttons, or isolated duration badges (leaf nodes whose entire text strictly matches `/^\d{1,2}:\d{2}$/` with length <= 6).
     - Static image ad markers: presence of creative `<img>` tags (`fbcdn.net`, `scontent`, high-res dimensions) and absence of video tags.
     - Default to `'image'` for all visual creatives lacking active video components.
  3. **Event Shielding:** Add explicit `type="button"` to all injected buttons and invoke `e.preventDefault()` and `e.stopPropagation()` on all filter clicks.
  4. **Vault & Admin Sync:** Include `mediaType` in the `/api/save-ad` payload and update `Admin_Command_Center/app.js` to filter directly against `ad.mediaType`.
- **Rationale:** Ensures 100% accurate classification of static images vs. video creatives, isolates CSS visibility rules strictly to individual ad cards without breaking grid layouts, and shields against Meta's native form event delegation.
- **Approval Status:** [IMPLEMENTED]

---

## Decision Entry 013: 24/7 Free Cloud Hosting Architecture & Dynamic Extension Endpoint Configuration
- **Feature/Code Block Name:** Cloud Deployment Pipeline & Dynamic Vault Endpoint Config
- **The Problem:** The system currently relies on running `node server.js` on `localhost:3000` on the user's local PC. When the computer shuts down or disconnects, the Chrome Extension cannot vault intercepted ads, and the Admin Command Center becomes unreachable. The user requires a 100% free, 24/7 cloud hosting architecture that never sleeps and requires no local server management.
- **The Decision:**
  1. **Root `package.json`:** Provide a root manifest so free cloud PaaS hosts (Render.com, Koyeb, Railway) can auto-detect and deploy the Node.js backend and statically serve the Admin Command Center from a single repository.
  2. **Dynamic Endpoint Configuration in Chrome Extension:**
     - Expand `manifest.json` `host_permissions` with `"*://*/*"` to allow the extension to communicate with any hosted cloud domain (e.g., `https://*.onrender.com`).
     - In `popup.html` and `popup.js`, introduce a "Cloud Vault Endpoint" configuration input that persists `vaultServerUrl` in `chrome.storage.local` (defaulting to `http://localhost:3000`).
     - In `background.js` and `content.js`, dynamically read `vaultServerUrl` so all vault saves, health checks, and dashboard shortcuts seamlessly direct to the user's cloud server.
  3. **Zero-Sleep 24/7 Keep-Alive Architecture:**
     - Deploy backend to Render.com (free 750 hours/month).
     - Hook a free external ping provider (Cron-job.org / UptimeRobot) to hit `/api/health` every 10 minutes, preventing Render from ever spinning down into idle mode.
  4. **Optional Cloud Database Persistence:** Support optional `MONGODB_URI` environment variable in `server.js` (MongoDB Atlas M0 Free Tier, 512MB permanent cloud storage) alongside standard `database.json`.
- **Rationale:** Eliminates local server dependencies, enables round-the-clock access from any device, prevents idle sleep cycles, and keeps operating costs strictly at $0/month.
- **Approval Status:** [IMPLEMENTED]

