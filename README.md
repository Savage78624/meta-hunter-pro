# Meta Hunter Pro (Code Name: Ad Oracle) ⚡🇮🇳
### *Elite Reverse-Engineering Suite for Indian D2C Media Buying & Dropshipping Intelligence*

---

## 🧭 Executive Overview

**Meta Hunter Pro (Ad Oracle)** is an anti-fragile, 3-tier software suite built for high-volume Direct-to-Consumer (D2C) media buyers and dropshippers operating in the Indian market. 

Standard ad spy tools cost $50–$150/month, store your discovered products on public cloud servers, and rely on fragile Meta CSS class names that break with every Facebook React build. More critically, **they calculate ROAS using Western e-commerce assumptions (100% prepaid), ignoring the harsh realities of the Indian Cash-on-Delivery (COD) ecosystem where 25%–35% Return-to-Origin (RTO) rates destroy unoptimized media buying campaigns.**

Ad Oracle solves this by operating **locally and privately**, bypassing Meta's scrambled DOM through immutable text-anchor heuristics, evaluating ad lifespans with a Traffic Light system, and injecting an **Indian COD True Margin & RTO Breakeven ROAS Calculator** directly onto every ad card in the Meta Ads Library.

---

## 🏗️ 3-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AD ORACLE ECOSYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│    CHROME EXTENSION (MV3)    │              │    ADMIN COMMAND CENTER      │
│  /Ad_Analyst_Extension/      │              │  /Admin_Command_Center/      │
│                              │              │                              │
│ • Sticky Hunt Bar            │              │ • Top-Bar RTO Tool [🧮]      │
│ • In-Grid Filter Toolbar     │              │ • Saved Winning Ads Grid     │
│ • Media (Video/Image) Filter │              │ • Media & Lifespan Filters   │
│ • Lifespan (>3d, >1w..>3m)   │              │ • Competitor Stores Ledger   │
│ • Traffic Light (>14d, 5-13d)│              │ • Interactive RTO Sandbox    │
│ • Exclusion Engine (>100k)   │              │ • CSV Export for Media Buyers│
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │                                             │
               │ HTTP POST /api/save-ad                      │ HTTP GET /api/vault
               │ HTTP POST /api/save-store                   │ HTTP DELETE /api/*
               ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LOCAL VAULT SERVER (/Meta_Ad_Server/)                   │
│                                                                             │
│ • Node.js + Express on Port 3000                                            │
│ • Flat-file JSON Storage: database.json (Zero external DB overhead)        │
│ • Auto-store extraction from landing page URLs                              │
│ • Real-time health check: /api/health                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Directory Structure

```text
Ad Hunter Pro/
├── decisions.md                 # Mandatory Architectural Decision Ledger (Protocols 001-008)
├── README.md                    # Setup documentation & media buying playbook
├── Ad_Analyst_Extension/        # Tier 1: Chrome Extension (Manifest V3)
│   ├── manifest.json            # MV3 configuration & permissions
│   ├── background.js            # Background service worker & badge telemetry
│   ├── content.js               # Scramble-resilient DOM engine & RTO injector
│   ├── style.css                # Cyber-emerald glowing themes & Hunt Bar styles
│   └── popup.html               # Extension telemetry popup with health ping
├── Meta_Ad_Server/              # Tier 2: Local Vault Backend
│   ├── package.json             # Express & CORS dependencies
│   ├── server.js                # REST API, static admin serving, and atomic DB
│   └── database.json            # Flat-file database for ads & competitor stores
└── Admin_Command_Center/        # Tier 3: Standalone Executive Dashboard
    ├── index.html               # Tailwind CSS dark dashboard
    ├── app.js                   # Vault sync, filters, RTO sandbox, and CSV export
    └── style.css                # Typography & custom scrollbars
```

---

## 🇮🇳 The Indian Market D2C Reality & RTO Mathematics

### Why 80% of Dropshippers in India Go Bankrupt
In Western markets (US, UK, CA), 98%+ of e-commerce transactions are prepaid with credit cards or PayPal. Return rates rarely exceed 8%, and customers pay for return shipping.

In India:
1. **70%–80% of all orders are Cash on Delivery (COD)**.
2. **25%–35% of shipments Return to Origin (RTO)** due to impulse cancellations, fake addresses, or delayed delivery.
3. When a parcel returns to origin, **the merchant pays double courier freight**:
   - Forward Courier Charge: ~₹70
   - Reverse Logistics RTO Charge: ~₹60
   - **Total courier penalty per RTO order = ~₹130**.
4. Novice media buyers target a conventional 2.0x Meta ROAS and believe they are profitable, while losing ₹30,000 to ₹70,000 every month on courier RTO penalties.

### The Ad Oracle True Breakeven ROAS Formula
Ad Oracle injects this exact mathematical model into every ad card and provides a live sandbox in the Command Center:

$$\text{Delivered Orders} = 100 \times \left(1 - \frac{\text{RTO}\%}{100}\right)$$

$$\text{Returned Orders} = 100 \times \left(\frac{\text{RTO}\%}{100}\right)$$

$$\text{Realized Revenue} = \text{Delivered Orders} \times \text{Selling Price}$$

$$\text{Product COGS} = \text{Delivered Orders} \times \text{Sourcing Cost}$$

$$\text{Logistics Expense} = (100 \times \text{Forward Courier}) + (\text{Returned Orders} \times \text{Reverse Courier})$$

$$\text{Gross Margin Pool} = \text{Realized Revenue} - \text{Product COGS} - \text{Logistics Expense}$$

$$\text{Breakeven ROAS} = \frac{\text{Realized Revenue}}{\text{Gross Margin Pool}}$$

$$\text{Max Allowable CPA} = \frac{\text{Gross Margin Pool}}{100}$$

#### ROAS Risk Triage:
- **$\le$ 2.2x ROAS:** **Safe & Scalable** (Wide gross margin buffer; ideal for scaling Facebook budget).
- **2.3x – 2.8x ROAS:** **Moderate Margin** (Requires strict COD confirmation calls via WhatsApp/IVR).
- **$>$ 2.8x ROAS:** **Dangerous RTO Trap** (High probability of negative net profits).

---

## 🚀 Quickstart Installation Guide

### Step 1: Start the Local Vault Backend
Ensure Node.js (v18+) is installed on your system.

```bash
cd "Meta_Ad_Server"
npm install
npm start
```
The server will boot on `http://localhost:3000`:
- **Admin Dashboard:** `http://localhost:3000/admin`
- **Vault API:** `http://localhost:3000/api/vault`
- **Health Check:** `http://localhost:3000/api/health`

### Step 2: Install the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `Ad_Analyst_Extension` directory inside this repository.
5. The **Meta Hunter Pro (Ad Oracle)** extension icon will appear in your Chrome toolbar.

### Step 3: Launch Meta Ads Library
1. Open [Meta Ads Library for India](https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN).
2. The sticky **Hunt Bar** will automatically mount at the top of the viewport.
3. Click any **D2C Footprint chip** (e.g., `"Cash on Delivery"`, `"Viral TikTok"`, `"Free Delivery All Over India"`).
4. Watch Ad Oracle evaluate ad cards:
   - **Green Glow:** Winner ad running for $>$ 14 days.
   - **Orange Glow:** Testing ad running 5–13 days.
   - **Red Glow:** Volatile test ad running $<$ 4 days.
5. Inspect the injected **Indian RTO Calculator** on the ad card. Adjust Selling Price or Sourcing Cost to see live ROAS targets.
6. Click **`💾 Save to Vault`** to synchronize the winning creative to your local database!

### Step 4: Open the Admin Command Center
Navigate to `http://localhost:3000/admin` or open `Admin_Command_Center/index.html` in your browser:
- Filter saved winning ads by Lifespan (`>14d Winners`, `Testing`, `Volatile`).
- Search ads by brand, keyword, or Ad ID.
- Access the **Competitor Stores Ledger** to monitor Shopify and WooCommerce stores.
- Run profitability simulations in the **Indian COD RTO Simulator**.
- Export winning ads to CSV for your media buying and creative teams.

---

## 🛡️ Anti-Scramble DOM Engineering (How It Works)

Meta frequently runs A/B tests on their Ads Library DOM and compiles React components with randomized class names such as `x1lliihq`, `x1plvlek`, `xry648c`. Any scraper or extension targeting these classes will break within days.

**Ad Oracle bypasses class selectors entirely:**
1. **Immutable Anchor Discovery:** Searches the DOM using `TreeWalker` for permanent text anchors: `"Library ID:"`, `"Started running on"`, and `"Launched in"`.
2. **Container Ascent:** Climbs up the DOM tree from the text anchor until it reaches the card container bounding box (`offsetWidth > 240px` enclosing the ad media and CTA).
3. **Idempotent Marking:** Tags processed elements with `data-oracle-processed="true"` to prevent duplicate injections during React reconciliation.
4. **Debounced MutationObserver:** Observes DOM additions during infinite scroll with a 250ms debounce window to ensure zero browser lag.

---

## 📜 The `decisions.md` Mandatory Protocol

Every architectural choice, technical rationale, and implementation status is tracked in `decisions.md`. Before any code was written, the architectural intent was formally logged:
- **Decision 001:** System Topology & 3-Tier Architecture `[IMPLEMENTED]`
- **Decision 002:** Meta Ads Library DOM Interception & Scramble Resistance `[IMPLEMENTED]`
- **Decision 003:** Traffic Light Lifespan Evaluation Engine `[IMPLEMENTED]`
- **Decision 004:** Indian Market True RTO & Margin Calculator `[IMPLEMENTED]`
- **Decision 005:** Drop-Shipping Footprint "Hunt Bar" & AI Keyword Hunter `[IMPLEMENTED]`
- **Decision 006:** Exclusion Engine (>100k likes, Corporate/B2B keywords) `[IMPLEMENTED]`
- **Decision 007:** Flat-File Vault Backend & Local Storage Proxy `[IMPLEMENTED]`
- **Decision 011:** Precision In-Row Filter Bar Placement in Meta's Native Filter Header Row `[IMPLEMENTED]`
- **Decision 012:** Fix Media Type Evaluation & "Images Only" Grid Collapse `[IMPLEMENTED]`
- **Decision 013:** 24/7 Free Cloud Hosting Architecture & Dynamic Extension Endpoint Configuration `[IMPLEMENTED]`

---

## ☁️ 24/7 Free Cloud Hosting (No Localhost / PC Required)

You can run the entire backend and Admin Command Center 24/7 in the cloud completely free without keeping your computer on:

1. **Deploy to Render.com:**
   - Push this repo to GitHub (Private).
   - In Render dashboard, click **New + > Web Service** and select your repo.
   - Build Command: `npm install`
   - Start Command: `node Meta_Ad_Server/server.js`
   - Plan: **Free** (750 free hours/month).
   - Once deployed, you get a free HTTPS link: `https://your-app.onrender.com`.

2. **24/7 Zero-Sleep Keep-Alive:**
   - Render's free tier sleeps after 15 min of inactivity.
   - Go to [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) (100% free).
   - Create a monitor to ping `https://your-app.onrender.com/api/health` every **10 minutes**.
   - Your server will now stay awake 24/7/365 at zero cost.

3. **Link Your Chrome Extension:**
   - Click the extension icon in Chrome.
   - In the **Vault Endpoint** input, paste `https://your-app.onrender.com` and click **Save & Ping**.
   - The badge turns green: `Cloud 24/7 | Cloud Online`.
   - All vaulted ads and the Command Center (`https://your-app.onrender.com/admin`) now work 24/7 from any device!

---

## ⚖️ License & Confidentiality
Built exclusively for internal media buying teams. All data is kept 100% locally on `localhost:3000` with zero third-party telemetry.
"# meta-hunter-pro" 
