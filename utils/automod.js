const config = require('../config/config.js');

// Load bad words from file
let badWords = [];
try {
    badWords = require('../data/badwords.json');
} catch (error) {
    console.log('Bad words file not found, using basic filter');
    badWords = ['spam', 'scam', 'hack'];
}

// Message tracking for spam detection
const messageTracking = new Map();

function checkAutomod(message) {
    const content = message.content.toLowerCase();
    const author = message.author;
    const userId = author.id;

    // Skip if user has admin permissions
    if (message.member && message.member.permissions.has('Administrator')) {
        return { violation: false };
    }

    // Check for bad words
    const badWordCheck = checkBadWords(content);
    if (badWordCheck.violation) {
        return badWordCheck;
    }

    // Check for spam
    const spamCheck = checkSpam(userId, message.createdTimestamp);
    if (spamCheck.violation) {
        return spamCheck;
    }

    // Check for excessive mentions
    const mentionCheck = checkMentions(message);
    if (mentionCheck.violation) {
        return mentionCheck;
    }

    // Check for excessive emojis
    const emojiCheck = checkEmojis(content);
    if (emojiCheck.violation) {
        return emojiCheck;
    }

    // Check for suspicious links
    const linkCheck = checkLinks(content);
    if (linkCheck.violation) {
        return linkCheck;
    }

    // Check for caps spam
    const capsCheck = checkCapsSpam(content);
    if (capsCheck.violation) {
        return capsCheck;
    }

    return { violation: false };
}

function checkBadWords(content) {
    for (const word of badWords) {
        if (content.includes(word.toLowerCase())) {
            return {
                violation: true,
                reason: 'Bad language detected',
                severity: 'medium'
            };
        }
    }
    return { violation: false };
}

function checkSpam(userId, timestamp) {
    if (!messageTracking.has(userId)) {
        messageTracking.set(userId, []);
    }

    const userMessages = messageTracking.get(userId);
    const now = timestamp;

    // Remove messages older than the time window
    const filtered = userMessages.filter(time => now - time < config.automod.timeWindow);
    
    // Add current message
    filtered.push(now);
    messageTracking.set(userId, filtered);

    // Check if too many messages in time window
    if (filtered.length > config.automod.maxMessages) {
        return {
            violation: true,
            reason: 'Spam detected',
            severity: 'high'
        };
    }

    return { violation: false };
}

function checkMentions(message) {
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    
    if (mentions > config.automod.maxMentions) {
        return {
            violation: true,
            reason: 'Excessive mentions',
            severity: 'medium'
        };
    }

    return { violation: false };
}

function checkEmojis(content) {
    // Count emojis (custom and unicode)
    const emojiRegex = /<a?:\w+:\d+>|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu;
    const emojiMatches = content.match(emojiRegex) || [];

    if (emojiMatches.length > config.automod.maxEmojis) {
        return {
            violation: true,
            reason: 'Excessive emojis',
            severity: 'low'
        };
    }

    return { violation: false };
}

function checkLinks(content) {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = content.match(urlRegex) || [];

    // Suspicious domains
    const suspiciousDomains = [
        'bit.ly',
        'tinyurl.com',
        'shorturl.at',
        'discord.gift',
        'discordnitro.info',
        'steam-wallet.com'
    ];

    for (const url of urls) {
        for (const domain of suspiciousDomains) {
            if (url.includes(domain)) {
                return {
                    violation: true,
                    reason: 'Suspicious link detected',
                    severity: 'high'
                };
            }
        }
    }

    // Too many links
    if (urls.length > 2) {
        return {
            violation: true,
            reason: 'Excessive links',
            severity: 'medium'
        };
    }

    return { violation: false };
}

function checkCapsSpam(content) {
    if (content.length < 10) return { violation: false }; // Skip short messages

    const uppercaseCount = (content.match(/[A-Z]/g) || []).length;
    const uppercasePercentage = uppercaseCount / content.length;

    if (uppercasePercentage > 0.7) { // 70% uppercase
        return {
            violation: true,
            reason: 'Excessive caps',
            severity: 'low'
        };
    }

    return { violation: false };
}

function checkRepeatedCharacters(content) {
    // Check for repeated characters (like "aaaaaaa" or "!!!!!!")
    const repeatedChars = /(.)\1{4,}/g; // 5 or more repeated characters
    
    if (repeatedChars.test(content)) {
        return {
            violation: true,
            reason: 'Repeated character spam',
            severity: 'low'
        };
    }

    return { violation: false };
}

function checkZalgo(content) {
    // Basic zalgo text detection (excessive combining characters)
    const combiningChars = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
    const combiningMatches = content.match(combiningChars) || [];
    
    if (combiningMatches.length > 10) {
        return {
            violation: true,
            reason: 'Zalgo text detected',
            severity: 'medium'
        };
    }

    return { violation: false };
}

// Clean up old message tracking periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, messages] of messageTracking.entries()) {
        const filtered = messages.filter(time => now - time < config.automod.timeWindow * 2);
        if (filtered.length === 0) {
            messageTracking.delete(userId);
        } else {
            messageTracking.set(userId, filtered);
        }
    }
}, 60000); // Clean up every minute

module.exports = {
    checkAutomod,
    checkBadWords,
    checkSpam,
    checkMentions,
    checkEmojis,
    checkLinks,
    checkCapsSpam,
    checkRepeatedCharacters,
    checkZalgo
};
