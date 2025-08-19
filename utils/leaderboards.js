const { UserSchema, GangSchema } = require('../database/schema.js');
const { createEmbed, formatNumber, formatTime } = require('./embeds.js');
const config = require('../config/config.js');

async function updateLeaderboards(client) {
    try {
        // Update message leaderboard
        if (config.channels.leaderboard) {
            await updateMessageLeaderboard(client);
        }

        // Update voice leaderboard
        if (config.channels.voiceLeaderboard) {
            await updateVoiceLeaderboard(client);
        }

        // Update gang leaderboard
        if (config.channels.gangLeaderboard) {
            await updateGangLeaderboard(client);
        }

        console.log('Leaderboards updated successfully');
    } catch (error) {
        console.error('Error updating leaderboards:', error);
    }
}

async function updateMessageLeaderboard(client) {
    try {
        const channel = client.channels.cache.get(config.channels.leaderboard);
        if (!channel) return;

        const topUsers = UserSchema.getLeaderboard('message_count', 15);
        
        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const medal = getMedal(i);
            
            try {
                const discordUser = await client.users.fetch(user.id);
                description += `${medal} **${discordUser.username}** - ${formatNumber(user.message_count)} messages\n`;
            } catch (error) {
                description += `${medal} **Unknown User** - ${formatNumber(user.message_count)} messages\n`;
            }
        }

        const embed = createEmbed(
            '📊 Message Leaderboard',
            description || 'No users found',
            'primary'
        );

        embed.setFooter({ 
            text: `Last updated: ${new Date().toLocaleString()}`,
            iconURL: client.user.displayAvatarURL()
        });

        // Clear channel and send new leaderboard
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages);
        }

        await channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error updating message leaderboard:', error);
    }
}

async function updateVoiceLeaderboard(client) {
    try {
        const channel = client.channels.cache.get(config.channels.voiceLeaderboard);
        if (!channel) return;

        const topUsers = UserSchema.getLeaderboard('voice_time', 15);
        
        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const medal = getMedal(i);
            
            try {
                const discordUser = await client.users.fetch(user.id);
                description += `${medal} **${discordUser.username}** - ${formatTime(user.voice_time)}\n`;
            } catch (error) {
                description += `${medal} **Unknown User** - ${formatTime(user.voice_time)}\n`;
            }
        }

        const embed = createEmbed(
            '🔊 Voice Time Leaderboard',
            description || 'No users found',
            'primary'
        );

        embed.setFooter({ 
            text: `Last updated: ${new Date().toLocaleString()}`,
            iconURL: client.user.displayAvatarURL()
        });

        // Clear channel and send new leaderboard
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages);
        }

        await channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error updating voice leaderboard:', error);
    }
}

async function updateGangLeaderboard(client) {
    try {
        const channel = client.channels.cache.get(config.channels.gangLeaderboard);
        if (!channel) return;

        const topGangs = GangSchema.getGangLeaderboard(15);
        
        let description = '';
        for (let i = 0; i < topGangs.length; i++) {
            const gang = topGangs[i];
            const medal = getMedal(i);
            const members = GangSchema.getGangMembers(gang.id);
            
            description += `${medal} **${gang.name}** - Level ${gang.level}\n`;
            description += `    └ ${members.length} members • ${config.currency.emoji} ${formatNumber(gang.vault)} vault\n\n`;
        }

        const embed = createEmbed(
            '⚔️ Gang Leaderboard',
            description || 'No gangs found',
            'warning'
        );

        embed.setFooter({ 
            text: `Last updated: ${new Date().toLocaleString()}`,
            iconURL: client.user.displayAvatarURL()
        });

        // Clear channel and send new leaderboard
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages);
        }

        await channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error updating gang leaderboard:', error);
    }
}

function getMedal(position) {
    switch (position) {
        case 0:
            return '🥇';
        case 1:
            return '🥈';
        case 2:
            return '🥉';
        default:
            return `${position + 1}.`;
    }
}

async function generateTopStats(client) {
    try {
        const stats = {
            totalUsers: 0,
            totalMessages: 0,
            totalVoiceTime: 0,
            totalGangs: 0,
            totalCoins: 0
        };

        // Get all users for total stats
        const allUsers = UserSchema.getLeaderboard('coins', 10000); // Get many users
        
        stats.totalUsers = allUsers.length;
        stats.totalMessages = allUsers.reduce((sum, user) => sum + user.message_count, 0);
        stats.totalVoiceTime = allUsers.reduce((sum, user) => sum + user.voice_time, 0);
        stats.totalCoins = allUsers.reduce((sum, user) => sum + user.coins, 0);

        // Get gang count
        const allGangs = GangSchema.getGangLeaderboard(1000);
        stats.totalGangs = allGangs.length;

        return stats;
    } catch (error) {
        console.error('Error generating top stats:', error);
        return null;
    }
}

async function createWeeklyReport(client) {
    try {
        const stats = await generateTopStats(client);
        if (!stats) return null;

        const embed = createEmbed(
            '📈 Weekly Server Report',
            `**Server Statistics:**\n` +
            `👥 **Total Users:** ${formatNumber(stats.totalUsers)}\n` +
            `📝 **Total Messages:** ${formatNumber(stats.totalMessages)}\n` +
            `🔊 **Total Voice Time:** ${formatTime(stats.totalVoiceTime)}\n` +
            `⚔️ **Total Gangs:** ${formatNumber(stats.totalGangs)}\n` +
            `${config.currency.emoji} **Total Currency:** ${formatNumber(stats.totalCoins)} ${config.currency.name}\n\n` +
            `**Top Performers This Week:**`,
            'success'
        );

        // Add top user of the week
        const topMessageUser = UserSchema.getLeaderboard('message_count', 1)[0];
        const topVoiceUser = UserSchema.getLeaderboard('voice_time', 1)[0];
        const topRichUser = UserSchema.getLeaderboard('coins', 1)[0];

        if (topMessageUser) {
            try {
                const user = await client.users.fetch(topMessageUser.id);
                embed.addFields({
                    name: '🏆 Most Active Chatter',
                    value: `${user.username} - ${formatNumber(topMessageUser.message_count)} messages`,
                    inline: true
                });
            } catch (error) {
                // User not found
            }
        }

        if (topVoiceUser) {
            try {
                const user = await client.users.fetch(topVoiceUser.id);
                embed.addFields({
                    name: '🎤 Voice Champion',
                    value: `${user.username} - ${formatTime(topVoiceUser.voice_time)}`,
                    inline: true
                });
            } catch (error) {
                // User not found
            }
        }

        if (topRichUser) {
            try {
                const user = await client.users.fetch(topRichUser.id);
                embed.addFields({
                    name: '💰 Richest Member',
                    value: `${user.username} - ${config.currency.emoji} ${formatNumber(topRichUser.coins)}`,
                    inline: true
                });
            } catch (error) {
                // User not found
            }
        }

        return embed;
    } catch (error) {
        console.error('Error creating weekly report:', error);
        return null;
    }
}

module.exports = {
    updateLeaderboards,
    updateMessageLeaderboard,
    updateVoiceLeaderboard,
    updateGangLeaderboard,
    generateTopStats,
    createWeeklyReport
};
