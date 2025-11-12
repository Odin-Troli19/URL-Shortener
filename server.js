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

// --- Middleware ---
app.use(express.json()); // To parse JSON request bodies
app.use(express.static('public')); // To serve static files from the 'public' directory

// --- Database Initialization ---

/**
 * Initializes the SQLite database.
 * Creates the 'urls' table if it doesn't exist.
 */
async function initDb() {
  try {
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });

    // Create the table for storing URLs
    await db.exec(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        longUrl TEXT NOT NULL,
        shortCode TEXT NOT NULL UNIQUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database connected and table initialized.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1); // Exit the process if DB connection fails
  }
}

// --- Helper Functions ---

/**
 * Validates if a string is a valid HTTP/HTTPS URL.
 * @param {string} urlString - The URL string to validate.
 * @returns {boolean} - True if valid, false otherwise.
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
 * Generates a unique short code.
 * @returns {string} - A 6-character hex string.
 */
function generateShortCode() {
  // Using crypto for a simple, reasonably unique string
  return crypto.randomBytes(3).toString('hex');
}

// --- API Endpoints ---

/**
 * 🔗 POST /shorten
 * Creates a new short URL.
 * Request Body: { "longUrl": "https://example.com" }
 * Response: { "shortUrl": "http://localhost:3000/abcdef" }
 */
app.post('/shorten', async (req, res) => {
  const { longUrl } = req.body;

  // 1. Validate the URL
  if (!longUrl || !isValidUrl(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  try {
    // 2. Check if this URL is already shortened
    const existing = await db.get('SELECT shortCode FROM urls WHERE longUrl = ?', longUrl);
    if (existing) {
      const shortUrl = `http://localhost:${PORT}/${existing.shortCode}`;
      return res.json({ shortUrl });
    }

    // 3. If not, create a new short code
    // (In a real-world app, you'd loop until you find an unused code)
    const shortCode = generateShortCode();

    // 4. Insert into database
    await db.run(
      'INSERT INTO urls (longUrl, shortCode) VALUES (?, ?)',
      longUrl,
      shortCode
    );

    // 5. Respond with the new short URL
    const shortUrl = `http://localhost:${PORT}/${shortCode}`;
    res.status(201).json({ shortUrl });

  } catch (err) {
    console.error('Error in /shorten:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ➡️ GET /:shortCode
 * Redirects the user to the original long URL.
 */
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    // 1. Find the long URL in the database
    const result = await db.get('SELECT longUrl FROM urls WHERE shortCode = ?', shortCode);

    // 2. If found, redirect
    if (result) {
      return res.redirect(301, result.longUrl);
    } else {
      // 3. If not found, send a 404
      return res.status(404).send('URL not found');
    }
  } catch (err) {
    console.error('Error in /:shortCode:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Server Startup ---
async function startServer() {
  await initDb(); // Initialize the database first
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();