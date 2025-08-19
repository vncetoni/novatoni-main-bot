const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { UserSchema, GangSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const { generateProfileCard } = require('../utils/canvas.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Profile commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your or another user\'s profile')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view profile for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('customize')
                .setDescription('Customize your profile card')
                .addStringOption(option =>
                    option.setName('background')
                        .setDescription('Background theme')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Default', value: 'default' },
                            { name: 'Dark Galaxy', value: 'galaxy' },
                            { name: 'Ocean Wave', value: 'ocean' },
                            { name: 'Sunset', value: 'sunset' },
                            { name: 'Forest', value: 'forest' }
                        ))
                .addStringOption(option =>
                    option.setName('nameplate')
                        .setDescription('Nameplate style')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Default', value: 'default' },
                            { name: 'Gold', value: 'gold' },
                            { name: 'Silver', value: 'silver' },
                            { name: 'Rainbow', value: 'rainbow' },
                            { name: 'Neon', value: 'neon' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View detailed profile statistics')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view stats for')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Ensure user exists in database
        UserSchema.createUser(userId, interaction.user.username);

        switch (subcommand) {
            case 'view':
                await this.handleView(interaction);
                break;
            case 'customize':
                await this.handleCustomize(interaction);
                break;
            case 'stats':
                await this.handleStats(interaction);
                break;
        }
    },

    async handleView(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        UserSchema.createUser(targetUser.id, targetUser.username);
        
        const userData = UserSchema.getUser(targetUser.id);
        const userGang = GangSchema.getUserGang(targetUser.id);

        try {
            const profileCard = await generateProfileCard(targetUser, userData, userGang);
            const attachment = new AttachmentBuilder(profileCard, { name: 'profile.png' });

            const embed = createEmbed(
                `${targetUser.username}'s Profile`,
                `**Level:** ${userData.level}\n**Experience:** ${userData.experience.toLocaleString()}/1000\n**${config.currency.name}:** ${config.currency.emoji} ${userData.coins.toLocaleString()}\n**Messages:** ${userData.message_count.toLocaleString()}\n**Voice Time:** ${Math.floor(userData.voice_time / 60)} minutes\n**Gang:** ${userGang ? userGang.name : 'None'}`,
                'primary'
            );

            embed.setImage('attachment://profile.png');

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Error generating profile card:', error);
            
            // Fallback to text-based profile
            const embed = createEmbed(
                `${targetUser.username}'s Profile`,
                `**Level:** ${userData.level}\n**Experience:** ${userData.experience.toLocaleString()}/1000\n**${config.currency.name}:** ${config.currency.emoji} ${userData.coins.toLocaleString()}\n**Messages:** ${userData.message_count.toLocaleString()}\n**Voice Time:** ${Math.floor(userData.voice_time / 60)} minutes\n**Gang:** ${userGang ? userGang.name : 'None'}\n**Background:** ${userData.profile_background}\n**Nameplate:** ${userData.profile_nameplate}`,
                'primary'
            );

            embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async handleCustomize(interaction) {
        const userId = interaction.user.id;
        const background = interaction.options.getString('background');
        const nameplate = interaction.options.getString('nameplate');

        const userData = UserSchema.getUser(userId);
        const updateData = {};

        // Check if user has enough coins for premium customizations
        const premiumBackgrounds = ['galaxy', 'ocean', 'sunset', 'forest'];
        const premiumNameplates = ['gold', 'silver', 'rainbow', 'neon'];
        
        let cost = 0;

        if (background && background !== userData.profile_background) {
            if (premiumBackgrounds.includes(background)) {
                cost += 500;
            }
            updateData.profile_background = background;
        }

        if (nameplate && nameplate !== userData.profile_nameplate) {
            if (premiumNameplates.includes(nameplate)) {
                cost += 300;
            }
            updateData.profile_nameplate = nameplate;
        }

        if (Object.keys(updateData).length === 0) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'No changes specified!', 'error')],
                ephemeral: true
            });
        }

        if (cost > 0 && userData.coins < cost) {
            return interaction.reply({
                embeds: [createEmbed('Error', `You need ${config.currency.emoji} **${cost}** ${config.currency.name} to purchase these customizations!`, 'error')],
                ephemeral: true
            });
        }

        try {
            if (cost > 0) {
                UserSchema.addCoins(userId, -cost);
            }
            UserSchema.updateUser(userId, updateData);

            let description = 'Profile customization updated!\n\n';
            if (background) description += `**Background:** ${background}\n`;
            if (nameplate) description += `**Nameplate:** ${nameplate}\n`;
            if (cost > 0) description += `\n**Cost:** ${config.currency.emoji} **${cost}** ${config.currency.name}`;

            const embed = createEmbed(
                'Profile Updated!',
                description,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error updating profile:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to update profile.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleStats(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        UserSchema.createUser(targetUser.id, targetUser.username);
        
        const userData = UserSchema.getUser(targetUser.id);
        const userGang = GangSchema.getUserGang(targetUser.id);

        // Calculate rank
        const allUsers = UserSchema.getLeaderboard('experience', 1000);
        const rank = allUsers.findIndex(u => u.id === targetUser.id) + 1;

        const embed = createEmbed(
            `${targetUser.username}'s Statistics`,
            `**Global Rank:** #${rank || 'Unranked'}\n**Level:** ${userData.level}\n**Experience:** ${userData.experience.toLocaleString()}/1000\n**${config.currency.name}:** ${config.currency.emoji} ${userData.coins.toLocaleString()}\n\n**Activity Stats:**\n• Messages Sent: ${userData.message_count.toLocaleString()}\n• Voice Time: ${Math.floor(userData.voice_time / 60)} minutes\n• Hours Online: ${Math.floor(userData.voice_time / 3600)} hours\n\n**Gang Information:**\n• Gang: ${userGang ? userGang.name : 'None'}\n• Role: ${userGang ? userGang.role : 'N/A'}\n\n**Profile:**\n• Background: ${userData.profile_background}\n• Nameplate: ${userData.profile_nameplate}\n• Account Created: <t:${Math.floor(new Date(userData.created_at).getTime() / 1000)}:R>`,
            'primary'
        );

        embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));

        await interaction.reply({ embeds: [embed] });
    }
};
