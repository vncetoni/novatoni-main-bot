const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ShopSchema } = require('../database/schema.js');
const { createEmbed } = require('./embeds.js');
const config = require('../config/config.js');

function createShopEmbed() {
    const perkItems = ShopSchema.getItems('perk');
    const gangPerkItems = ShopSchema.getItems('gang_perk');

    // Personal Perks Embed
    const perkEmbed = createEmbed(
        '🛍️ Personal Perks Shop',
        'Purchase perks for yourself with NOVACOIN!',
        'primary'
    );

    if (perkItems.length === 0) {
        perkEmbed.addFields({
            name: 'No Items Available',
            value: 'The shop is currently empty. Check back later!',
            inline: false
        });
    } else {
        // Add default perks if none exist in database
        const defaultPerks = [
            {
                id: 1,
                name: '🛡️ Rob Protection',
                description: 'Protects you from robberies for 24 hours',
                price: 500,
                icon: '🛡️'
            },
            {
                id: 2,
                name: '💎 Double Rob',
                description: 'Your next successful rob gives double coins',
                price: 750,
                icon: '💎'
            },
            {
                id: 3,
                name: '🎨 Profile Background',
                description: 'Unlock premium profile backgrounds',
                price: 1000,
                icon: '🎨'
            },
            {
                id: 4,
                name: '✨ VIP Status',
                description: 'Get the VIP role and special privileges',
                price: 2000,
                icon: '✨'
            },
            {
                id: 5,
                name: '🎭 Custom Nameplate',
                description: 'Unlock premium nameplate styles',
                price: 800,
                icon: '🎭'
            }
        ];

        const itemsToShow = perkItems.length > 0 ? perkItems : defaultPerks;

        itemsToShow.forEach(item => {
            perkEmbed.addFields({
                name: `${item.icon || '🎁'} ${item.name}`,
                value: `${item.description}\n**Price:** ${config.currency.emoji} ${item.price.toLocaleString()} ${config.currency.name}`,
                inline: true
            });
        });
    }

    // Personal Perks Buttons
    const perkComponents = [];
    const itemsToShow = perkItems.length > 0 ? perkItems : getDefaultPerks();
    
    for (let i = 0; i < itemsToShow.length; i += 5) {
        const row = new ActionRowBuilder();
        const rowItems = itemsToShow.slice(i, i + 5);
        
        rowItems.forEach(item => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`buy_${item.id}`)
                    .setLabel(`Buy ${item.name}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(item.icon || '🎁')
            );
        });
        
        perkComponents.push(row);
    }

    // Gang Perks Embed
    const gangEmbed = createEmbed(
        '⚔️ Gang Perks Shop',
        'Purchase perks for your gang with NOVACOIN!',
        'warning'
    );

    const defaultGangPerks = [
        {
            id: 101,
            name: '💰 Gang Vault Boost',
            description: 'Increases gang vault capacity by 50%',
            price: 2500,
            icon: '💰'
        },
        {
            id: 102,
            name: '⚡ Fast Recruitment',
            description: 'Allows recruiting more members faster',
            price: 1500,
            icon: '⚡'
        },
        {
            id: 103,
            name: '🔥 Gang XP Boost',
            description: 'All gang members gain 25% more XP',
            price: 3000,
            icon: '🔥'
        },
        {
            id: 104,
            name: '👑 Elite Status',
            description: 'Unlocks elite gang features and role',
            price: 5000,
            icon: '👑'
        },
        {
            id: 105,
            name: '🛡️ Gang Protection',
            description: 'Protects all gang members from raids for 24h',
            price: 4000,
            icon: '🛡️'
        }
    ];

    const gangItemsToShow = gangPerkItems.length > 0 ? gangPerkItems : defaultGangPerks;

    gangItemsToShow.forEach(item => {
        gangEmbed.addFields({
            name: `${item.icon || '⚔️'} ${item.name}`,
            value: `${item.description}\n**Price:** ${config.currency.emoji} ${item.price.toLocaleString()} ${config.currency.name}`,
            inline: true
        });
    });

    // Gang Perks Buttons
    const gangComponents = [];
    
    for (let i = 0; i < gangItemsToShow.length; i += 5) {
        const row = new ActionRowBuilder();
        const rowItems = gangItemsToShow.slice(i, i + 5);
        
        rowItems.forEach(item => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`buy_${item.id}`)
                    .setLabel(`Buy ${item.name}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(item.icon || '⚔️')
            );
        });
        
        gangComponents.push(row);
    }

    return {
        perkEmbed,
        perkComponents,
        gangEmbed,
        gangComponents
    };
}

function getDefaultPerks() {
    return [
        {
            id: 1,
            name: 'Rob Protection',
            description: 'Protects you from robberies for 24 hours',
            price: 500,
            icon: '🛡️',
            type: 'perk'
        },
        {
            id: 2,
            name: 'Double Rob',
            description: 'Your next successful rob gives double coins',
            price: 750,
            icon: '💎',
            type: 'perk'
        },
        {
            id: 3,
            name: 'Profile Background',
            description: 'Unlock premium profile backgrounds',
            price: 1000,
            icon: '🎨',
            type: 'perk'
        },
        {
            id: 4,
            name: 'VIP Status',
            description: 'Get the VIP role and special privileges',
            price: 2000,
            icon: '✨',
            type: 'perk'
        },
        {
            id: 5,
            name: 'Custom Nameplate',
            description: 'Unlock premium nameplate styles',
            price: 800,
            icon: '🎭',
            type: 'perk'
        }
    ];
}

function createPurchaseConfirmation(item, user) {
    const embed = createEmbed(
        '✅ Purchase Successful!',
        `${user} has successfully purchased **${item.name}**!\n\n**Description:** ${item.description}\n**Price:** ${config.currency.emoji} ${item.price.toLocaleString()} ${config.currency.name}`,
        'success'
    );

    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    embed.setTimestamp();

    return embed;
}

function createInsufficientFundsEmbed(item, userCoins) {
    const needed = item.price - userCoins;
    
    const embed = createEmbed(
        '❌ Insufficient Funds',
        `You don't have enough ${config.currency.name} to purchase **${item.name}**!\n\n**Required:** ${config.currency.emoji} ${item.price.toLocaleString()} ${config.currency.name}\n**You have:** ${config.currency.emoji} ${userCoins.toLocaleString()} ${config.currency.name}\n**Need:** ${config.currency.emoji} ${needed.toLocaleString()} ${config.currency.name} more`,
        'error'
    );

    return embed;
}

function createItemNotFoundEmbed() {
    const embed = createEmbed(
        '❌ Item Not Found',
        'The item you\'re trying to purchase could not be found. It may have been removed from the shop.',
        'error'
    );

    return embed;
}

function createAlreadyOwnedEmbed(item) {
    const embed = createEmbed(
        '⚠️ Already Owned',
        `You already own **${item.name}**! You cannot purchase the same item multiple times.`,
        'warning'
    );

    return embed;
}

module.exports = {
    createShopEmbed,
    createPurchaseConfirmation,
    createInsufficientFundsEmbed,
    createItemNotFoundEmbed,
    createAlreadyOwnedEmbed,
    getDefaultPerks
};
