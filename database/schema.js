const { db } = require('./database.js');

class UserSchema {
    static getUser(id) {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    }

    static createUser(id, username) {
        const stmt = db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)');
        return stmt.run(id, username);
    }

    static updateUser(id, data) {
        const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = Object.values(data);
        const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
        return stmt.run(...values, id);
    }

    static addCoins(id, amount) {
        const stmt = db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?');
        return stmt.run(amount, id);
    }

    static addExperience(id, amount) {
        const stmt = db.prepare('UPDATE users SET experience = experience + ? WHERE id = ?');
        const result = stmt.run(amount, id);
        
        // Check for level up
        const user = this.getUser(id);
        const newLevel = Math.floor(user.experience / 1000) + 1;
        if (newLevel > user.level) {
            this.updateUser(id, { level: newLevel });
            return { levelUp: true, newLevel };
        }
        return { levelUp: false };
    }

    static getLeaderboard(type = 'message_count', limit = 10) {
        const stmt = db.prepare(`SELECT * FROM users ORDER BY ${type} DESC LIMIT ?`);
        return stmt.all(limit);
    }
}

class GangSchema {
    static createGang(name, leaderId) {
        const stmt = db.prepare('INSERT INTO gangs (name, leader_id) VALUES (?, ?)');
        const result = stmt.run(name, leaderId);
        
        // Add leader as member
        const memberStmt = db.prepare('INSERT INTO gang_members (user_id, gang_id, role) VALUES (?, ?, ?)');
        memberStmt.run(leaderId, result.lastInsertRowid, 'leader');
        
        return result;
    }

    static getGang(id) {
        const stmt = db.prepare('SELECT * FROM gangs WHERE id = ?');
        return stmt.get(id);
    }

    static getGangByName(name) {
        const stmt = db.prepare('SELECT * FROM gangs WHERE name = ?');
        return stmt.get(name);
    }

    static getUserGang(userId) {
        const stmt = db.prepare(`
            SELECT g.*, gm.role 
            FROM gangs g 
            JOIN gang_members gm ON g.id = gm.gang_id 
            WHERE gm.user_id = ?
        `);
        return stmt.get(userId);
    }

    static getGangMembers(gangId) {
        const stmt = db.prepare(`
            SELECT u.*, gm.role, gm.joined_at
            FROM users u
            JOIN gang_members gm ON u.id = gm.user_id
            WHERE gm.gang_id = ?
            ORDER BY gm.joined_at
        `);
        return stmt.all(gangId);
    }

    static joinGang(userId, gangId, role = 'member') {
        const stmt = db.prepare('INSERT INTO gang_members (user_id, gang_id, role) VALUES (?, ?, ?)');
        return stmt.run(userId, gangId, role);
    }

    static leaveGang(userId) {
        const stmt = db.prepare('DELETE FROM gang_members WHERE user_id = ?');
        return stmt.run(userId);
    }

    static updateGangVault(gangId, amount) {
        const stmt = db.prepare('UPDATE gangs SET vault = vault + ? WHERE id = ?');
        return stmt.run(amount, gangId);
    }

    static getGangLeaderboard(limit = 10) {
        const stmt = db.prepare('SELECT * FROM gangs ORDER BY level DESC, experience DESC LIMIT ?');
        return stmt.all(limit);
    }
}

class ReactionSchema {
    static addReaction(userId, targetId, reactionType) {
        const stmt = db.prepare(`
            INSERT INTO reactions (user_id, target_id, reaction_type, count) 
            VALUES (?, ?, ?, 1)
            ON CONFLICT(user_id, target_id, reaction_type) 
            DO UPDATE SET count = count + 1
        `);
        return stmt.run(userId, targetId, reactionType);
    }

    static getReactionCount(targetId, reactionType) {
        const stmt = db.prepare('SELECT SUM(count) as total FROM reactions WHERE target_id = ? AND reaction_type = ?');
        const result = stmt.get(targetId, reactionType);
        return result?.total || 0;
    }

    static getUserReactions(userId) {
        const stmt = db.prepare('SELECT * FROM reactions WHERE user_id = ?');
        return stmt.all(userId);
    }
}

class ModerationSchema {
    static addModeration(userId, moderatorId, action, reason, duration = null) {
        const expiresAt = duration ? new Date(Date.now() + duration) : null;
        const stmt = db.prepare(`
            INSERT INTO moderation (user_id, moderator_id, action, reason, duration, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, moderatorId, action, reason, duration, expiresAt);
    }

    static getActiveModerations(userId) {
        const stmt = db.prepare(`
            SELECT * FROM moderation 
            WHERE user_id = ? AND active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
        `);
        return stmt.all(userId);
    }

    static expireModeration(id) {
        const stmt = db.prepare('UPDATE moderation SET active = 0 WHERE id = ?');
        return stmt.run(id);
    }
}

class ShopSchema {
    static getItems(type = null) {
        let query = 'SELECT * FROM shop_items WHERE active = 1';
        if (type) {
            query += ' AND type = ?';
            const stmt = db.prepare(query);
            return stmt.all(type);
        }
        const stmt = db.prepare(query);
        return stmt.all();
    }

    static purchaseItem(userId, itemId, gangId = null) {
        const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
        if (!item) return null;

        const expiresAt = item.duration ? new Date(Date.now() + item.duration) : null;
        const stmt = db.prepare(`
            INSERT INTO purchases (user_id, gang_id, item_id, expires_at)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(userId, gangId, itemId, expiresAt);
    }

    static getUserPurchases(userId) {
        const stmt = db.prepare(`
            SELECT p.*, si.name, si.type, si.role_id
            FROM purchases p
            JOIN shop_items si ON p.item_id = si.id
            WHERE p.user_id = ? AND (p.expires_at IS NULL OR p.expires_at > datetime('now'))
        `);
        return stmt.all(userId);
    }
}

module.exports = {
    UserSchema,
    GangSchema,
    ReactionSchema,
    ModerationSchema,
    ShopSchema
};
