const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ThreadAutoArchiveDuration } = require('discord.js');
const { ModerationSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Moderation commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('jail')
                .setDescription('Jail a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to jail')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for jailing')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes (leave empty for permanent)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unjail')
                .setDescription('Release a user from jail')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to release')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for release')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for ban')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for kick')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for warning')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Mute a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to mute')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for mute')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear messages')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to delete (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getInteger('duration');

        switch (subcommand) {
            case 'jail':
                await this.handleJail(interaction, user, reason, duration);
                break;
            case 'unjail':
                await this.handleUnjail(interaction, user, reason);
                break;
            case 'ban':
                await this.handleBan(interaction, user, reason);
                break;
            case 'kick':
                await this.handleKick(interaction, user, reason);
                break;
            case 'warn':
                await this.handleWarn(interaction, user, reason);
                break;
            case 'mute':
                await this.handleMute(interaction, user, reason, duration);
                break;
            case 'clear':
                await this.handleClear(interaction);
                break;
        }
    },

    async handleJail(interaction, user, reason, duration) {
        try {
            const member = await interaction.guild.members.fetch(user.id);
            const jailRole = interaction.guild.roles.cache.get(config.roles.jailed);
            
            if (!jailRole) {
                return interaction.reply({
                    embeds: [createEmbed('Error', 'Jail role not found. Please configure the jail role ID.', 'error')],
                    ephemeral: true
                });
            }

            await member.roles.add(jailRole);
            
            const durationMs = duration ? duration * 60 * 1000 : null;
            ModerationSchema.addModeration(user.id, interaction.user.id, 'jail', reason, durationMs);

            // Create appeal thread
            if (config.channels.jailAppeals) {
                const appealsChannel = interaction.guild.channels.cache.get(config.channels.jailAppeals);
                if (appealsChannel) {
                    const thread = await appealsChannel.threads.create({
                        name: `${user.username}-jail-appeal`,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        type: ChannelType.PrivateThread
                    });

                    await thread.members.add(user.id);
                    
                    const appealEmbed = createEmbed(
                        'Jail Appeal Thread',
                        `**User:** ${user}\n**Reason:** ${reason}\n**Duration:** ${duration ? `${duration} minutes` : 'Permanent'}\n**Moderator:** ${interaction.user}\n\n${user}, you can appeal your jail here.`,
                        'warning'
                    );
                    
                    await thread.send({ embeds: [appealEmbed] });
                }
            }

            const embed = createEmbed(
                'User Jailed',
                `**User:** ${user}\n**Reason:** ${reason}\n**Duration:** ${duration ? `${duration} minutes` : 'Permanent'}\n**Moderator:** ${interaction.user}`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error jailing user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to jail user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleUnjail(interaction, user, reason) {
        try {
            const member = await interaction.guild.members.fetch(user.id);
            const jailRole = interaction.guild.roles.cache.get(config.roles.jailed);
            
            if (jailRole && member.roles.cache.has(jailRole.id)) {
                await member.roles.remove(jailRole);
            }

            // Expire moderation record
            const activeModerations = ModerationSchema.getActiveModerations(user.id);
            activeModerations.forEach(mod => {
                if (mod.action === 'jail') {
                    ModerationSchema.expireModeration(mod.id);
                }
            });

            const embed = createEmbed(
                'User Unjailed',
                `**User:** ${user}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user}`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error unjailing user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to unjail user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleBan(interaction, user, reason) {
        try {
            await interaction.guild.members.ban(user, { reason });
            ModerationSchema.addModeration(user.id, interaction.user.id, 'ban', reason);

            const embed = createEmbed(
                'User Banned',
                `**User:** ${user}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user}`,
                'error'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to ban user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleKick(interaction, user, reason) {
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick(reason);
            ModerationSchema.addModeration(user.id, interaction.user.id, 'kick', reason);

            const embed = createEmbed(
                'User Kicked',
                `**User:** ${user}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user}`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error kicking user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to kick user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleWarn(interaction, user, reason) {
        try {
            ModerationSchema.addModeration(user.id, interaction.user.id, 'warn', reason);

            const embed = createEmbed(
                'User Warned',
                `**User:** ${user}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user}`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

            // DM the user
            try {
                const dmEmbed = createEmbed(
                    'Warning Received',
                    `You have been warned in ${interaction.guild.name}\n**Reason:** ${reason}`,
                    'warning'
                );
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled
            }

        } catch (error) {
            console.error('Error warning user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to warn user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleMute(interaction, user, reason, duration) {
        try {
            const member = await interaction.guild.members.fetch(user.id);
            const durationMs = duration ? duration * 60 * 1000 : 10 * 60 * 1000; // Default 10 minutes
            
            await member.timeout(durationMs, reason);
            ModerationSchema.addModeration(user.id, interaction.user.id, 'mute', reason, durationMs);

            const embed = createEmbed(
                'User Muted',
                `**User:** ${user}\n**Reason:** ${reason}\n**Duration:** ${Math.floor(durationMs / 60000)} minutes\n**Moderator:** ${interaction.user}`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error muting user:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to mute user.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleClear(interaction) {
        try {
            const amount = interaction.options.getInteger('amount');
            const deleted = await interaction.channel.bulkDelete(amount, true);

            const embed = createEmbed(
                'Messages Cleared',
                `Successfully deleted ${deleted.size} messages.`,
                'success'
            );

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error clearing messages:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to clear messages.', 'error')],
                ephemeral: true
            });
        }
    }
};
