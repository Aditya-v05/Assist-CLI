const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// We'll store the database file in your home directory
// so it's always in the same place, no matter where you run 'assist'
const dbPath = path.join(os.homedir(), 'assist_snippets.db');
const db = new sqlite3.Database(dbPath);

// This function sets up the 'snippets' table
const initDb = () => {
  // Use .serialize to run queries in order
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS snippets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        tag TEXT,
        content TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully.');
  });
};

// We'll run this init function just once when the app starts
// (We'll call this from index.js)

module.exports = { db, initDb };