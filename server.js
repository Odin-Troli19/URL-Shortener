// Import necessary modules
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const crypto = require('crypto');
const path = require('path');

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'shortener.db';
let db; // Variable to hold the database connection

// Rate limiting storage (in-memory for simplicity)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

// --- Middleware ---
app.use(express.json());
app.use(express.static('public'));

// Rate limiting middleware
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  const timestamps = rateLimitStore.get(ip).filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  next();
}

// --- Database Initialization ---

/**
 * Initializes the SQLite database with enhanced schema
 */
async function initDb() {
  try {
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });

    // Enhanced table with analytics, expiration, and metadata
    await db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        longUrl TEXT NOT NULL,
        shortCode TEXT NOT NULL UNIQUE,
        customAlias TEXT UNIQUE,
        title TEXT,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiresAt TIMESTAMP,
        clicks INTEGER DEFAULT 0,
        lastClickedAt TIMESTAMP,
        creatorIp TEXT,
        isActive BOOLEAN DEFAULT 1,
        password TEXT
      )
    `);

    // Table for click analytics
    await db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT NOT NULL,
        clickedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        referer TEXT,
        userAgent TEXT,
        ipAddress TEXT,
        country TEXT,
        FOREIGN KEY (shortCode) REFERENCES urls(shortCode)
      )
    `);

    // Table for API keys
    await db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apiKey TEXT NOT NULL UNIQUE,
        name TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        isActive BOOLEAN DEFAULT 1,
        requestCount INTEGER DEFAULT 0,
        lastUsedAt TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_shortCode ON urls(shortCode);
      CREATE INDEX IF NOT EXISTS idx_customAlias ON urls(customAlias);
      CREATE INDEX IF NOT EXISTS idx_analytics_shortCode ON analytics(shortCode);
    `);

    console.log('Database connected and tables initialized.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  }
}

// --- Helper Functions ---

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Generates a unique short code
 */
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validates custom alias (alphanumeric, dash, underscore only)
 */
function isValidAlias(alias) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(alias);
}

/**
 * Hash password for protected URLs
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Check if URL has expired
 */
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Record click analytics
 */
async function recordClick(shortCode, req) {
  try {
    const referer = req.get('referer') || 'Direct';
    const userAgent = req.get('user-agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    await db.run(
      'INSERT INTO analytics (shortCode, referer, userAgent, ipAddress) VALUES (?, ?, ?, ?)',
      shortCode, referer, userAgent, ipAddress
    );

    await db.run(
      'UPDATE urls SET clicks = clicks + 1, lastClickedAt = CURRENT_TIMESTAMP WHERE shortCode = ?',
      shortCode
    );
  } catch (err) {
    console.error('Error recording analytics:', err.message);
  }
}

// --- API Endpoints ---

/**
 * 🔗 POST /shorten
 * Creates a new short URL with optional features
 * Request Body: {
 *   "longUrl": "https://example.com",
 *   "customAlias": "mylink" (optional),
 *   "expiresIn": 3600 (optional, seconds),
 *   "password": "secret" (optional),
 *   "title": "My Link" (optional),
 *   "description": "Link description" (optional)
 * }
 */
app.post('/shorten', rateLimiter, async (req, res) => {
  const { longUrl, customAlias, expiresIn, password, title, description } = req.body;

  // Validate URL
  if (!longUrl || !isValidUrl(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  // Validate custom alias if provided
  if (customAlias && !isValidAlias(customAlias)) {
    return res.status(400).json({ 
      error: 'Invalid custom alias. Use 3-20 alphanumeric characters, dashes, or underscores.' 
    });
  }

  try {
    // Check if custom alias already exists
    if (customAlias) {
      const existing = await db.get('SELECT id FROM urls WHERE customAlias = ? OR shortCode = ?', customAlias, customAlias);
      if (existing) {
        return res.status(409).json({ error: 'Custom alias already in use' });
      }
    }

    // Check if URL already shortened (without custom alias)
    if (!customAlias) {
      const existing = await db.get('SELECT shortCode, customAlias FROM urls WHERE longUrl = ? AND expiresAt IS NULL', longUrl);
      if (existing) {
        const identifier = existing.customAlias || existing.shortCode;
        const shortUrl = `http://localhost:${PORT}/${identifier}`;
        return res.json({ shortUrl, existing: true });
      }
    }

    // Generate short code
    let shortCode = customAlias || generateShortCode();
    let attempts = 0;
    while (!customAlias && attempts < 5) {
      const exists = await db.get('SELECT id FROM urls WHERE shortCode = ?', shortCode);
      if (!exists) break;
      shortCode = generateShortCode();
      attempts++;
    }

    // Calculate expiration
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Hash password if provided
    const hashedPassword = password ? hashPassword(password) : null;

    // Get creator IP
    const creatorIp = req.ip || req.connection.remoteAddress;

    // Insert into database
    await db.run(
      `INSERT INTO urls (longUrl, shortCode, customAlias, title, description, expiresAt, password, creatorIp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      longUrl, shortCode, customAlias, title, description, expiresAt, hashedPassword, creatorIp
    );

    // Respond with the new short URL
    const identifier = customAlias || shortCode;
    const shortUrl = `http://localhost:${PORT}/${identifier}`;
    res.status(201).json({ 
      shortUrl,
      shortCode: identifier,
      expiresAt: expiresAt,
      protected: !!password
    });

  } catch (err) {
    console.error('Error in /shorten:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * 📊 GET /stats/:shortCode
 * Get analytics for a short URL
 */
app.get('/stats/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    // Get URL info
    const url = await db.get(
      'SELECT longUrl, shortCode, customAlias, title, clicks, createdAt, expiresAt, lastClickedAt FROM urls WHERE shortCode = ? OR customAlias = ?',
      shortCode, shortCode
    );

    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    // Get recent clicks
    const recentClicks = await db.all(
      'SELECT clickedAt, referer, userAgent FROM analytics WHERE shortCode = ? ORDER BY clickedAt DESC LIMIT 50',
      url.shortCode
    );

    // Get click counts by date (last 30 days)
    const clicksByDate = await db.all(`
      SELECT DATE(clickedAt) as date, COUNT(*) as count 
      FROM analytics 
      WHERE shortCode = ? AND clickedAt >= datetime('now', '-30 days')
      GROUP BY DATE(clickedAt)
      ORDER BY date DESC
    `, url.shortCode);

    // Get top referers
    const topReferers = await db.all(`
      SELECT referer, COUNT(*) as count
      FROM analytics
      WHERE shortCode = ?
      GROUP BY referer
      ORDER BY count DESC
      LIMIT 10
    `, url.shortCode);

    res.json({
      url: {
        longUrl: url.longUrl,
        shortCode: url.customAlias || url.shortCode,
        title: url.title,
        totalClicks: url.clicks,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
        lastClickedAt: url.lastClickedAt
      },
      recentClicks: recentClicks.slice(0, 10),
      clicksByDate,
      topReferers
    });

  } catch (err) {
    console.error('Error in /stats:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * 📋 GET /list
 * List all URLs (with pagination)
 */
app.get('/list', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    const urls = await db.all(
      `SELECT shortCode, customAlias, longUrl, title, clicks, createdAt, expiresAt, isActive 
       FROM urls 
       WHERE isActive = 1
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      limit, offset
    );

    const total = await db.get('SELECT COUNT(*) as count FROM urls WHERE isActive = 1');

    res.json({
      urls: urls.map(url => ({
        shortUrl: `http://localhost:${PORT}/${url.customAlias || url.shortCode}`,
        longUrl: url.longUrl,
        title: url.title,
        clicks: url.clicks,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt
      })),
      pagination: {
        page,
        limit,
        total: total.count,
        totalPages: Math.ceil(total.count / limit)
      }
    });

  } catch (err) {
    console.error('Error in /list:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * 🗑️ DELETE /delete/:shortCode
 * Soft delete a URL (mark as inactive)
 */
app.delete('/delete/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await db.run(
      'UPDATE urls SET isActive = 0 WHERE shortCode = ? OR customAlias = ?',
      shortCode, shortCode
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ success: true, message: 'URL deleted successfully' });

  } catch (err) {
    console.error('Error in /delete:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * 🔍 GET /search?q=query
 * Search URLs by long URL, title, or description
 */
app.get('/search', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const results = await db.all(
      `SELECT shortCode, customAlias, longUrl, title, description, clicks, createdAt 
       FROM urls 
       WHERE isActive = 1 AND (longUrl LIKE ? OR title LIKE ? OR description LIKE ?)
       ORDER BY clicks DESC
       LIMIT 20`,
      `%${query}%`, `%${query}%`, `%${query}%`
    );

    res.json({
      results: results.map(url => ({
        shortUrl: `http://localhost:${PORT}/${url.customAlias || url.shortCode}`,
        longUrl: url.longUrl,
        title: url.title,
        description: url.description,
        clicks: url.clicks,
        createdAt: url.createdAt
      }))
    });

  } catch (err) {
    console.error('Error in /search:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * 🔐 POST /verify/:shortCode
 * Verify password for protected URL
 */
app.post('/verify/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  const { password } = req.body;

  try {
    const url = await db.get(
      'SELECT password FROM urls WHERE (shortCode = ? OR customAlias = ?) AND isActive = 1',
      shortCode, shortCode
    );

    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    if (!url.password) {
      return res.status(400).json({ error: 'URL is not password protected' });
    }

    const hashedPassword = hashPassword(password);
    if (hashedPassword === url.password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }

  } catch (err) {
    console.error('Error in /verify:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ➡️ GET /:shortCode
 * Redirects to the original URL with analytics tracking
 */
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await db.get(
      'SELECT longUrl, expiresAt, password FROM urls WHERE (shortCode = ? OR customAlias = ?) AND isActive = 1',
      shortCode, shortCode
    );

    if (!result) {
      return res.status(404).send('URL not found');
    }

    // Check if expired
    if (isExpired(result.expiresAt)) {
      return res.status(410).send('URL has expired');
    }

    // Check if password protected
    if (result.password) {
      // Redirect to password page (in a real app, this would be a proper UI)
      return res.status(401).send('This URL is password protected. Please provide the password.');
    }

    // Record analytics
    await recordClick(shortCode, req);

    // Redirect
    return res.redirect(301, result.longUrl);

  } catch (err) {
    console.error('Error in /:shortCode:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Cleanup expired URLs (runs every hour) ---
setInterval(async () => {
  try {
    await db.run('UPDATE urls SET isActive = 0 WHERE expiresAt IS NOT NULL AND expiresAt < datetime("now")');
    console.log('Cleaned up expired URLs');
  } catch (err) {
    console.error('Error cleaning up expired URLs:', err.message);
  }
}, 3600000); // 1 hour

// --- Server Startup ---
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 Enhanced URL Shortener running on http://localhost:${PORT}`);
    console.log(`📊 Features: Analytics, Custom URLs, Expiration, Rate Limiting, Search`);
  });
}

startServer();