const path = require('path');
const dbPath = 'C:/Users/ArshPathan/AppData/Roaming/quickprint/quickprint.db';
let db;
try {
    const sqlite = require('better-sqlite3');
    db = sqlite(dbPath);
    console.log('--- DATABASE INSPECTION ---');
    console.log('PRINTERS:', JSON.stringify(db.prepare('SELECT * FROM Printer').all(), null, 2));
    console.log('SHOPS:', JSON.stringify(db.prepare('SELECT * FROM Shop').all(), null, 2));
    console.log('--- END ---');
} catch (e) {
    console.error('FAILED:', e.message);
}
