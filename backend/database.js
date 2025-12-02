const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)){
    fs.mkdirSync(DATA_DIR);
}

const dbPath = path.join(DATA_DIR, 'multiplication.db');

let db;
try {
    db = new Database(dbPath);
    console.log('Connected to the SQLite database.');
    initDb();
} catch (err) {
    console.error('Error opening database ' + dbPath, err.message);
    process.exit(1);
}

function initDb() {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        factor_a INTEGER NOT NULL,
        factor_b INTEGER NOT NULL,
        user_answer INTEGER NOT NULL,
        correct_answer INTEGER NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_taken_ms INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS disabled_factors (
        user_id INTEGER NOT NULL,
        factor INTEGER NOT NULL,
        PRIMARY KEY (user_id, factor),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
}

module.exports = db;
