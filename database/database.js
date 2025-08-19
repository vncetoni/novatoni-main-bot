const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bot.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

function initializeDatabase() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT,
            coins INTEGER DEFAULT 0,
            experience INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            daily_last DATETIME,
            work_last DATETIME,
            rob_last DATETIME,
            rob_protection_until DATETIME,
            double_rob_until DATETIME,
            message_count INTEGER DEFAULT 0,
            voice_time INTEGER DEFAULT 0,
            profile_background TEXT DEFAULT 'default',
            profile_nameplate TEXT DEFAULT 'default',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Gangs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS gangs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            leader_id TEXT,
            vault INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            experience INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (leader_id) REFERENCES users (id)
        )
    `);

    // Gang members table
    db.exec(`
        CREATE TABLE IF NOT EXISTS gang_members (
            user_id TEXT,
            gang_id INTEGER,
            role TEXT DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, gang_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (gang_id) REFERENCES gangs (id)
        )
    `);

    // Reactions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            target_id TEXT,
            reaction_type TEXT,
            count INTEGER DEFAULT 1,
            UNIQUE(user_id, target_id, reaction_type),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (target_id) REFERENCES users (id)
        )
    `);

    // Moderation table
    db.exec(`
        CREATE TABLE IF NOT EXISTS moderation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            moderator_id TEXT,
            action TEXT,
            reason TEXT,
            duration INTEGER,
            expires_at DATETIME,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (moderator_id) REFERENCES users (id)
        )
    `);

    // Shop items table
    db.exec(`
        CREATE TABLE IF NOT EXISTS shop_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price INTEGER,
            type TEXT, -- 'perk' or 'gang_perk'
            role_id TEXT,
            duration INTEGER, -- in milliseconds, null for permanent
            icon TEXT,
            active BOOLEAN DEFAULT 1
        )
    `);

    // Purchases table
    db.exec(`
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            gang_id INTEGER,
            item_id INTEGER,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (gang_id) REFERENCES gangs (id),
            FOREIGN KEY (item_id) REFERENCES shop_items (id)
        )
    `);

    // Auto responses table
    db.exec(`
        CREATE TABLE IF NOT EXISTS auto_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_text TEXT,
            response_text TEXT,
            chance REAL DEFAULT 1.0,
            active BOOLEAN DEFAULT 1
        )
    `);

    // Auto reacts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS auto_reacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_text TEXT,
            emoji TEXT,
            chance REAL DEFAULT 1.0,
            active BOOLEAN DEFAULT 1
        )
    `);

    console.log('Database initialized successfully');
}

module.exports = {
    db,
    initializeDatabase
};
