const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.js');

function createEmbed(title, description, type = 'primary') {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ 
            text: 'Nova Bot • Made with ❤️',
            iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png' // Placeholder for bot avatar
        });

    // Set colors based on type
    switch (type) {
        case 'success':
            embed.setColor(0x00FF00);
            break;
        case 'error':
            embed.setColor(0xFF0000);
            break;
        case 'warning':
            embed.setColor(0xFFFF00);
            break;
        case 'primary':
        default:
            embed.setColor(0x0099FF);
            break;
    }

    return embed;
}

function createProgressBar(current, max, length = 10) {
    const percentage = Math.min(current / max, 1);
    const filled = Math.floor(percentage * length);
    const empty = length - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
}

async function sendRandomDrop(channel) {
    const dropAmount = Math.floor(Math.random() * (config.currency.dropAmount.max - config.currency.dropAmount.min + 1)) + config.currency.dropAmount.min;
    
    const embed = createEmbed(
        '💰 Wild Currency Appeared!',
        `${config.currency.emoji} **${dropAmount}** ${config.currency.name} has appeared! First to react with 💰 gets it!`,
        'success'
    );

    try {
        const message = await channel.send({ embeds: [embed] });
        await message.react('💰');

        const filter = (reaction, user) => reaction.emoji.name === '💰' && !user.bot;
        const collector = message.createReactionCollector({ filter, max: 1, time: 30000 });

        collector.on('collect', (reaction, user) => {
            const { UserSchema } = require('../database/schema.js');
            UserSchema.createUser(user.id, user.username);
            UserSchema.addCoins(user.id, dropAmount);

            const claimEmbed = createEmbed(
                '💰 Currency Claimed!',
                `${user} quickly grabbed ${config.currency.emoji} **${dropAmount}** ${config.currency.name}!`,
                'success'
            );

            message.edit({ embeds: [claimEmbed] });

            setTimeout(() => {
                message.delete().catch(() => {});
            }, 5000);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const expiredEmbed = createEmbed(
                    '💰 Currency Expired',
                    `The ${config.currency.emoji} **${dropAmount}** ${config.currency.name} disappeared...`,
                    'warning'
                );

                message.edit({ embeds: [expiredEmbed] });

                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 3000);
            }
        });

    } catch (error) {
        console.error('Error sending random drop:', error);
    }
}

function formatNumber(number) {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
}

function formatTime(minutes) {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
}

function createLevelEmbed(user, userData) {
    const currentExp = userData.experience % 1000;
    const progressBar = createProgressBar(currentExp, 1000);
    
    const embed = createEmbed(
        `${user.username}'s Level`,
        `**Level:** ${userData.level}\n**Experience:** ${currentExp}/1000\n**Progress:** ${progressBar}\n\n${config.currency.emoji} **${userData.coins.toLocaleString()}** ${config.currency.name}`,
        'primary'
    );

    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
    
    return embed;
}

function createStatsEmbed(user, userData, rank = null) {
    const embed = createEmbed(
        `${user.username}'s Statistics`,
        `${rank ? `**Rank:** #${rank}\n` : ''}**Level:** ${userData.level}\n**Experience:** ${userData.experience.toLocaleString()}\n**${config.currency.name}:** ${config.currency.emoji} ${userData.coins.toLocaleString()}\n\n**Activity:**\n• Messages: ${userData.message_count.toLocaleString()}\n• Voice Time: ${formatTime(userData.voice_time)}\n\n**Profile:**\n• Background: ${userData.profile_background}\n• Nameplate: ${userData.profile_nameplate}`,
        'primary'
    );

    embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
    
    return embed;
}

function createGangEmbed(gang, members) {
    const leader = members.find(m => m.role === 'leader');
    const agents = members.filter(m => m.role === 'agent');
    const regularMembers = members.filter(m => m.role === 'member');

    let membersList = '';
    if (leader) membersList += `👑 <@${leader.id}> (Leader)\n`;
    agents.forEach(agent => membersList += `⭐ <@${agent.id}> (Agent)\n`);
    regularMembers.forEach(member => membersList += `👤 <@${member.id}> (Member)\n`);

    const embed = createEmbed(
        `Gang: ${gang.name}`,
        `**Members:** ${members.length}\n**Vault:** ${config.currency.emoji} ${gang.vault.toLocaleString()}\n**Level:** ${gang.level}\n**Experience:** ${gang.experience.toLocaleString()}\n\n**Members:**\n${membersList || 'No members'}`,
        'primary'
    );

    return embed;
}

module.exports = {
    createEmbed,
    createProgressBar,
    sendRandomDrop,
    formatNumber,
    formatTime,
    createLevelEmbed,
    createStatsEmbed,
    createGangEmbed
};
