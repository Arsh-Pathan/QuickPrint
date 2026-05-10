const sqlite = require('./apps/desktop-app/node_modules/better-sqlite3');
const db = sqlite('C:\\Users\\ArshPathan\\AppData\\Roaming\\quickprint\\quickprint.db');
console.log('PRINTERS:', JSON.stringify(db.prepare('SELECT * FROM Printer').all(), null, 2));
console.log('SHOPS:', JSON.stringify(db.prepare('SELECT * FROM Shop').all(), null, 2));
db.close();
