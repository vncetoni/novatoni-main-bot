const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { ShopSchema, UserSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const { createShopEmbed } = require('../utils/shop.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Manage the shop')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Show Shop', value: 'show' },
                            { name: 'Add Item', value: 'add' },
                            { name: 'Remove Item', value: 'remove' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('embed')
                .setDescription('Create custom embeds')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Embed title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Embed description')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Primary (Blue)', value: 'primary' },
                            { name: 'Success (Green)', value: 'success' },
                            { name: 'Warning (Yellow)', value: 'warning' },
                            { name: 'Error (Red)', value: 'error' }
                        ))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Thumbnail URL')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Image URL')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('coins')
                .setDescription('Manage user coins')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'Set', value: 'set' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Target user')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount of coins')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoresponse')
                .setDescription('Manage auto responses')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List', value: 'list' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoreact')
                .setDescription('Manage auto reacts')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List', value: 'list' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'shop':
                await this.handleShop(interaction);
                break;
            case 'embed':
                await this.handleEmbed(interaction);
                break;
            case 'coins':
                await this.handleCoins(interaction);
                break;
            case 'autoresponse':
                await this.handleAutoResponse(interaction);
                break;
            case 'autoreact':
                await this.handleAutoReact(interaction);
                break;
        }
    },

    async handleShop(interaction) {
        const action = interaction.options.getString('action');

        switch (action) {
            case 'show':
                await this.showShop(interaction);
                break;
            case 'add':
                await this.addShopItem(interaction);
                break;
            case 'remove':
                await this.removeShopItem(interaction);
                break;
        }
    },

    async showShop(interaction) {
        if (!config.channels.shop) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Shop channel not configured!', 'error')],
                ephemeral: true
            });
        }

        const shopChannel = interaction.guild.channels.cache.get(config.channels.shop);
        if (!shopChannel) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Shop channel not found!', 'error')],
                ephemeral: true
            });
        }

        try {
            // Clear existing messages
            const messages = await shopChannel.messages.fetch({ limit: 100 });
            await shopChannel.bulkDelete(messages);

            // Send shop embeds
            const { perkEmbed, perkComponents, gangEmbed, gangComponents } = createShopEmbed();

            await shopChannel.send({ embeds: [perkEmbed], components: perkComponents });
            await shopChannel.send({ embeds: [gangEmbed], components: gangComponents });

            await interaction.reply({
                embeds: [createEmbed('Success', 'Shop has been updated!', 'success')],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error updating shop:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to update shop.', 'error')],
                ephemeral: true
            });
        }
    },

    async addShopItem(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_shop_item')
            .setTitle('Add Shop Item');

        const nameInput = new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Item Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('item_description')
            .setLabel('Item Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const priceInput = new TextInputBuilder()
            .setCustomId('item_price')
            .setLabel('Price')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const typeInput = new TextInputBuilder()
            .setCustomId('item_type')
            .setLabel('Type (perk or gang_perk)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const roleInput = new TextInputBuilder()
            .setCustomId('item_role')
            .setLabel('Role ID (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(priceInput);
        const fourthRow = new ActionRowBuilder().addComponents(typeInput);
        const fifthRow = new ActionRowBuilder().addComponents(roleInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);
        await interaction.showModal(modal);
    },

    async removeShopItem(interaction) {
        // This would need a dropdown with existing items
        await interaction.reply({
            embeds: [createEmbed('Info', 'Item removal feature coming soon!', 'warning')],
            ephemeral: true
        });
    },

    async handleEmbed(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || 'primary';
        const thumbnail = interaction.options.getString('thumbnail');
        const image = interaction.options.getString('image');

        const embed = createEmbed(title, description, color);
        
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);

        await interaction.reply({ embeds: [embed] });
    },

    async handleCoins(interaction) {
        const action = interaction.options.getString('action');
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        UserSchema.createUser(targetUser.id, targetUser.username);
        const userData = UserSchema.getUser(targetUser.id);

        let newAmount;
        switch (action) {
            case 'add':
                UserSchema.addCoins(targetUser.id, amount);
                newAmount = userData.coins + amount;
                break;
            case 'remove':
                UserSchema.addCoins(targetUser.id, -amount);
                newAmount = Math.max(0, userData.coins - amount);
                break;
            case 'set':
                UserSchema.updateUser(targetUser.id, { coins: amount });
                newAmount = amount;
                break;
        }

        const embed = createEmbed(
            'Coins Updated',
            `**Action:** ${action}\n**User:** ${targetUser}\n**Amount:** ${config.currency.emoji} **${amount}** ${config.currency.name}\n**New Balance:** ${config.currency.emoji} **${newAmount}** ${config.currency.name}`,
            'success'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleAutoResponse(interaction) {
        const action = interaction.options.getString('action');

        switch (action) {
            case 'add':
                await this.addAutoResponse(interaction);
                break;
            case 'remove':
                await this.removeAutoResponse(interaction);
                break;
            case 'list':
                await this.listAutoResponses(interaction);
                break;
        }
    },

    async addAutoResponse(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_auto_response')
            .setTitle('Add Auto Response');

        const triggerInput = new TextInputBuilder()
            .setCustomId('trigger_text')
            .setLabel('Trigger Text')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const responseInput = new TextInputBuilder()
            .setCustomId('response_text')
            .setLabel('Response Text')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const chanceInput = new TextInputBuilder()
            .setCustomId('response_chance')
            .setLabel('Chance (0.0 - 1.0)')
            .setStyle(TextInputStyle.Short)
            .setValue('1.0')
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(triggerInput);
        const secondRow = new ActionRowBuilder().addComponents(responseInput);
        const thirdRow = new ActionRowBuilder().addComponents(chanceInput);

        modal.addComponents(firstRow, secondRow, thirdRow);
        await interaction.showModal(modal);
    },

    async removeAutoResponse(interaction) {
        await interaction.reply({
            embeds: [createEmbed('Info', 'Auto response removal feature coming soon!', 'warning')],
            ephemeral: true
        });
    },

    async listAutoResponses(interaction) {
        const { db } = require('../database/database.js');
        const responses = db.prepare('SELECT * FROM auto_responses WHERE active = 1').all();

        let description = '';
        responses.forEach((response, index) => {
            description += `**${index + 1}.** "${response.trigger_text}" → "${response.response_text}" (${Math.floor(response.chance * 100)}%)\n`;
        });

        const embed = createEmbed(
            'Auto Responses',
            description || 'No auto responses configured',
            'primary'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleAutoReact(interaction) {
        const action = interaction.options.getString('action');

        switch (action) {
            case 'add':
                await this.addAutoReact(interaction);
                break;
            case 'remove':
                await this.removeAutoReact(interaction);
                break;
            case 'list':
                await this.listAutoReacts(interaction);
                break;
        }
    },

    async addAutoReact(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_auto_react')
            .setTitle('Add Auto React');

        const triggerInput = new TextInputBuilder()
            .setCustomId('trigger_text')
            .setLabel('Trigger Text')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('react_emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const chanceInput = new TextInputBuilder()
            .setCustomId('react_chance')
            .setLabel('Chance (0.0 - 1.0)')
            .setStyle(TextInputStyle.Short)
            .setValue('1.0')
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(triggerInput);
        const secondRow = new ActionRowBuilder().addComponents(emojiInput);
        const thirdRow = new ActionRowBuilder().addComponents(chanceInput);

        modal.addComponents(firstRow, secondRow, thirdRow);
        await interaction.showModal(modal);
    },

    async removeAutoReact(interaction) {
        await interaction.reply({
            embeds: [createEmbed('Info', 'Auto react removal feature coming soon!', 'warning')],
            ephemeral: true
        });
    },

    async listAutoReacts(interaction) {
        const { db } = require('../database/database.js');
        const reacts = db.prepare('SELECT * FROM auto_reacts WHERE active = 1').all();

        let description = '';
        reacts.forEach((react, index) => {
            description += `**${index + 1}.** "${react.trigger_text}" → ${react.emoji} (${Math.floor(react.chance * 100)}%)\n`;
        });

        const embed = createEmbed(
            'Auto Reacts',
            description || 'No auto reacts configured',
            'primary'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
