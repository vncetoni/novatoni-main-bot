module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    currency: {
        name: 'NOVACOIN',
        emoji: '🪙', // Placeholder - will be replaced with custom emoji
        dailyAmount: 100,
        dropAmount: { min: 10, max: 50 }
    },
    channels: {
        jailAppeals: process.env.JAIL_APPEALS_CHANNEL || null,
        shop: process.env.SHOP_CHANNEL || null,
        gambling: process.env.GAMBLING_CHANNEL || null,
        leaderboard: process.env.LEADERBOARD_CHANNEL || null,
        voiceLeaderboard: process.env.VOICE_LEADERBOARD_CHANNEL || null,
        gangLeaderboard: process.env.GANG_LEADERBOARD_CHANNEL || null
    },
    roles: {
        jailed: process.env.JAILED_ROLE || null,
        gangstar: process.env.GANGSTAR_ROLE || null
    },
    cooldowns: {
        rob: 20 * 60 * 1000, // 20 minutes
        daily: 24 * 60 * 60 * 1000, // 24 hours
        work: 60 * 60 * 1000 // 1 hour
    },
    automod: {
        maxMessages: 5,
        timeWindow: 5000, // 5 seconds
        maxMentions: 3,
        maxEmojis: 5
    }
};
