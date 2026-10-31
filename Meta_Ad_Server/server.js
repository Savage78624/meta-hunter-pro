/**
 * Meta Hunter Pro (Ad Oracle) - Local Vault Backend
 * Port: 3000
 * Storage: database.json (Flat-file resilient persistence)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

// Middleware
app.use(cors({
  origin: '*', // Allows Chrome Extension (chrome-extension://*) and Admin Portal
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Admin Command Center
const ADMIN_PATH = path.join(__dirname, '..', 'Admin_Command_Center');
app.use('/admin', express.static(ADMIN_PATH));
app.use(express.static(ADMIN_PATH));

// Helper to ensure database.json exists and is valid
function getDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = { ads: [], stores: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.ads)) parsed.ads = [];
    if (!Array.isArray(parsed.stores)) parsed.stores = [];
    return parsed;
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to read database.json, resetting format:', err.message);
    const fallback = { ads: [], stores: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

// Helper to save database atomically
function saveDatabase(data) {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error('[DATABASE ERROR] Failed to write database.json:', err.message);
    return false;
  }
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Health check & stats
app.get('/api/health', (req, res) => {
  const db = getDatabase();
  res.json({
    status: 'online',
    system: 'Meta Hunter Pro (Ad Oracle Local Vault)',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      totalSavedAds: db.ads.length,
      totalMonitoredStores: db.stores.length
    }
  });
});

// GET /api/vault - Return all saved ads and competitor stores
app.get('/api/vault', (req, res) => {
  try {
    const db = getDatabase();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ads: db.ads,
      stores: db.stores
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-ad - Store or update intercepted ad data
app.post('/api/save-ad', (req, res) => {
  try {
    const adData = req.body;
    if (!adData || !adData.id) {
      return res.status(400).json({ success: false, error: 'Ad ID is required' });
    }

    const db = getDatabase();
    const existingIndex = db.ads.findIndex(a => String(a.id) === String(adData.id));

    const enrichedAd = {
      id: String(adData.id),
      brand: adData.brand || 'Unknown Brand',
      pageLikes: adData.pageLikes || 'N/A',
      startDate: adData.startDate || new Date().toISOString().split('T')[0],
      daysActive: typeof adData.daysActive === 'number' ? adData.daysActive : 1,
      status: adData.status || (adData.daysActive >= 14 ? 'Winner' : (adData.daysActive >= 5 ? 'Testing' : 'Volatile')),
      adCopy: adData.adCopy || '',
      mediaUrl: adData.mediaUrl || '',
      landingPage: adData.landingPage || '',
      platform: adData.platform || 'Shopify',
      rtoMetrics: adData.rtoMetrics || {
        sellingPrice: 999,
        sourcingCost: 250,
        rtoRate: 30,
        breakevenRoas: '2.50'
      },
      savedAt: new Date().toISOString(),
      tags: adData.tags || ['Meta Ads Library Intercept']
    };

    if (existingIndex >= 0) {
      db.ads[existingIndex] = { ...db.ads[existingIndex], ...enrichedAd, updated: true };
      console.log(`[VAULT] Updated existing Ad #${enrichedAd.id} (${enrichedAd.brand})`);
    } else {
      db.ads.unshift(enrichedAd);
      console.log(`[VAULT] Saved new Winning Ad #${enrichedAd.id} (${enrichedAd.brand}) - Active ${enrichedAd.daysActive} days`);
    }

    // Auto-save store if landing page present and not already saved
    if (enrichedAd.landingPage) {
      try {
        const urlObj = new URL(enrichedAd.landingPage);
        const domain = urlObj.origin;
        const storeExists = db.stores.some(s => s.storeUrl === domain);
        if (!storeExists && !domain.includes('facebook.com') && !domain.includes('instagram.com')) {
          db.stores.unshift({
            id: `store_${Date.now()}`,
            brand: enrichedAd.brand,
            storeUrl: domain,
            platform: enrichedAd.platform || 'Shopify',
            niche: 'Auto-extracted from Ad #' + enrichedAd.id,
            notes: `Extracted from ad: ${enrichedAd.adCopy.slice(0, 100)}...`,
            firstSeen: new Date().toISOString().split('T')[0],
            status: 'Active'
          });
          console.log(`[VAULT] Auto-registered competitor store: ${domain}`);
        }
      } catch (e) {
        // Ignore invalid URL
      }
    }

    saveDatabase(db);
    res.json({ success: true, message: 'Ad successfully secured in vault', ad: enrichedAd });
  } catch (err) {
    console.error('[API ERROR] /api/save-ad:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-store - Log competitor store for monitoring
app.post('/api/save-store', (req, res) => {
  try {
    const storeData = req.body;
    if (!storeData || !storeData.storeUrl) {
      return res.status(400).json({ success: false, error: 'Store URL is required' });
    }

    const db = getDatabase();
    let normalizedUrl = storeData.storeUrl.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const existingIndex = db.stores.findIndex(s => s.storeUrl.toLowerCase() === normalizedUrl.toLowerCase());

    const newStore = {
      id: storeData.id || `store_${Date.now()}`,
      brand: storeData.brand || 'Competitor Store',
      storeUrl: normalizedUrl,
      platform: storeData.platform || (normalizedUrl.includes('myshopify') ? 'Shopify' : 'WooCommerce/Custom'),
      niche: storeData.niche || 'Indian D2C Dropshipping',
      notes: storeData.notes || 'Manually saved via Command Center / Extension',
      firstSeen: storeData.firstSeen || new Date().toISOString().split('T')[0],
      status: storeData.status || 'Active'
    };

    if (existingIndex >= 0) {
      db.stores[existingIndex] = { ...db.stores[existingIndex], ...newStore };
      console.log(`[VAULT] Updated monitored store: ${normalizedUrl}`);
    } else {
      db.stores.unshift(newStore);
      console.log(`[VAULT] Added new monitored store: ${normalizedUrl}`);
    }

    saveDatabase(db);
    res.json({ success: true, message: 'Competitor store registered', store: newStore });
  } catch (err) {
    console.error('[API ERROR] /api/save-store:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/ad/:id - Remove ad from vault
app.delete('/api/ad/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const initialLen = db.ads.length;
    db.ads = db.ads.filter(a => String(a.id) !== String(id));

    if (db.ads.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Ad not found in vault' });
    }

    saveDatabase(db);
    console.log(`[VAULT] Removed Ad #${id}`);
    res.json({ success: true, message: `Ad #${id} removed` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/store/:id - Remove competitor store
app.delete('/api/store/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const initialLen = db.stores.length;
    db.stores = db.stores.filter(s => String(s.id) !== String(id));

    if (db.stores.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    saveDatabase(db);
    console.log(`[VAULT] Removed Store #${id}`);
    res.json({ success: true, message: `Store #${id} removed` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/calculate-rto - Utility calculator for testing Indian market unit economics
app.post('/api/calculate-rto', (req, res) => {
  try {
    const {
      sellingPrice = 999,
      sourcingCost = 250,
      rtoRate = 30, // in %
      forwardShipping = 70,
      reverseShipping = 60
    } = req.body;

    const sp = parseFloat(sellingPrice);
    const cogs = parseFloat(sourcingCost);
    const rto = parseFloat(rtoRate) / 100;
    const fwd = parseFloat(forwardShipping);
    const rev = parseFloat(reverseShipping);

    // Math:
    // Out of 100 orders:
    // Delivered orders = 100 * (1 - rto)
    // Returned orders = 100 * rto
    // Revenue = Delivered orders * sp
    // Product Cost = Delivered orders * cogs (returned stock is salvaged / back in inventory)
    // Shipping Expense = (100 * fwd) + (Returned orders * rev)
    // Gross Margin Pool = Revenue - Product Cost - Shipping Expense
    // Breakeven Ad Spend per 100 orders = Gross Margin Pool
    // Breakeven CPA = Breakeven Ad Spend / 100
    // Breakeven ROAS = Revenue / Breakeven Ad Spend = (Delivered * sp) / Gross Margin Pool

    const deliveredOrders = 100 * (1 - rto);
    const returnedOrders = 100 * rto;
    const totalRevenue = deliveredOrders * sp;
    const totalCogs = deliveredOrders * cogs;
    const totalShipping = (100 * fwd) + (returnedOrders * rev);
    const grossMarginPool = totalRevenue - totalCogs - totalShipping;

    const maxAllowableCpa = grossMarginPool / 100;
    const breakevenRoas = grossMarginPool > 0 ? (totalRevenue / grossMarginPool).toFixed(2) : 'UNPROFITABLE';
    const profitMarginPercent = totalRevenue > 0 ? ((grossMarginPool / totalRevenue) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      inputs: { sellingPrice: sp, sourcingCost: cogs, rtoRate: rto * 100, forwardShipping: fwd, reverseShipping: rev },
      economics: {
        deliveredOrders,
        returnedOrders,
        totalRevenue: Math.round(totalRevenue),
        totalCogs: Math.round(totalCogs),
        totalShipping: Math.round(totalShipping),
        grossMarginPool: Math.round(grossMarginPool),
        maxAllowableCpa: Math.round(maxAllowableCpa),
        breakevenRoas,
        profitMarginPercent: `${profitMarginPercent}%`,
        status: grossMarginPool > 0 ? (parseFloat(breakevenRoas) <= 2.2 ? 'Safe / Scalable' : 'High Risk / Needs High ROAS') : 'Dead on Arrival'
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`
  ======================================================
  🚀 META HUNTER PRO (AD ORACLE) - LOCAL VAULT SERVER
  ======================================================
  [+] Server running at: http://localhost:${PORT}
  [+] Vault endpoint:    http://localhost:${PORT}/api/vault
  [+] Health check:      http://localhost:${PORT}/api/health
  [+] Database File:     ${DB_PATH}
  ======================================================
  Ready to intercept, filter, and vault winning Meta ads!
  `);
});
