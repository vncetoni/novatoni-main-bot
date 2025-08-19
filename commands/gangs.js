const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GangSchema, UserSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gang')
        .setDescription('Gang commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new gang')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Gang name')
                        .setRequired(true)
                        .setMaxLength(32)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join a gang')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Gang name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current gang'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View gang information')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Gang name (leave empty for your gang)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('members')
                .setDescription('View gang members'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins to gang vault')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to deposit')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from gang vault (leader/agent only)')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('promote')
                .setDescription('Promote a gang member (leader only)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to promote')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('role')
                        .setDescription('New role')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Agent', value: 'agent' },
                            { name: 'Member', value: 'member' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a gang member (leader/agent only)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to kick')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View gang leaderboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Ensure user exists in database
        UserSchema.createUser(userId, interaction.user.username);

        switch (subcommand) {
            case 'create':
                await this.handleCreate(interaction);
                break;
            case 'join':
                await this.handleJoin(interaction);
                break;
            case 'leave':
                await this.handleLeave(interaction);
                break;
            case 'info':
                await this.handleInfo(interaction);
                break;
            case 'members':
                await this.handleMembers(interaction);
                break;
            case 'deposit':
                await this.handleDeposit(interaction);
                break;
            case 'withdraw':
                await this.handleWithdraw(interaction);
                break;
            case 'promote':
                await this.handlePromote(interaction);
                break;
            case 'kick':
                await this.handleKick(interaction);
                break;
            case 'leaderboard':
                await this.handleLeaderboard(interaction);
                break;
        }
    },

    async handleCreate(interaction) {
        const userId = interaction.user.id;
        const gangName = interaction.options.getString('name');

        // Check if user is already in a gang
        const userGang = GangSchema.getUserGang(userId);
        if (userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are already in a gang! Leave your current gang first.', 'error')],
                ephemeral: true
            });
        }

        // Check if gang name already exists
        const existingGang = GangSchema.getGangByName(gangName);
        if (existingGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'A gang with that name already exists!', 'error')],
                ephemeral: true
            });
        }

        // Check if user has enough coins (creation cost)
        const userData = UserSchema.getUser(userId);
        const creationCost = 1000;
        if (userData.coins < creationCost) {
            return interaction.reply({
                embeds: [createEmbed('Error', `You need ${config.currency.emoji} **${creationCost}** ${config.currency.name} to create a gang!`, 'error')],
                ephemeral: true
            });
        }

        try {
            // Create gang
            GangSchema.createGang(gangName, userId);
            UserSchema.addCoins(userId, -creationCost);

            // Add gangstar role
            const gangstarRole = interaction.guild.roles.cache.get(config.roles.gangstar);
            if (gangstarRole) {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(gangstarRole);
            }

            const embed = createEmbed(
                'Gang Created!',
                `**${gangName}** has been created successfully!\n\nYou are now the leader of your gang.\nCost: ${config.currency.emoji} **${creationCost}** ${config.currency.name}`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creating gang:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to create gang.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleJoin(interaction) {
        const userId = interaction.user.id;
        const gangName = interaction.options.getString('name');

        // Check if user is already in a gang
        const userGang = GangSchema.getUserGang(userId);
        if (userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are already in a gang! Leave your current gang first.', 'error')],
                ephemeral: true
            });
        }

        // Find gang
        const gang = GangSchema.getGangByName(gangName);
        if (!gang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Gang not found!', 'error')],
                ephemeral: true
            });
        }

        try {
            // Join gang
            GangSchema.joinGang(userId, gang.id);

            // Add gangstar role
            const gangstarRole = interaction.guild.roles.cache.get(config.roles.gangstar);
            if (gangstarRole) {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(gangstarRole);
            }

            const embed = createEmbed(
                'Joined Gang!',
                `You have successfully joined **${gang.name}**!`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error joining gang:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to join gang.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleLeave(interaction) {
        const userId = interaction.user.id;

        // Check if user is in a gang
        const userGang = GangSchema.getUserGang(userId);
        if (!userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are not in a gang!', 'error')],
                ephemeral: true
            });
        }

        if (userGang.role === 'leader') {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Gang leaders cannot leave their gang! Transfer leadership or disband the gang.', 'error')],
                ephemeral: true
            });
        }

        try {
            // Leave gang
            GangSchema.leaveGang(userId);

            // Remove gangstar role
            const gangstarRole = interaction.guild.roles.cache.get(config.roles.gangstar);
            if (gangstarRole) {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.remove(gangstarRole);
            }

            const embed = createEmbed(
                'Left Gang',
                `You have left **${userGang.name}**.`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error leaving gang:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to leave gang.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleInfo(interaction) {
        const userId = interaction.user.id;
        const gangName = interaction.options.getString('name');

        let gang;
        if (gangName) {
            gang = GangSchema.getGangByName(gangName);
        } else {
            const userGang = GangSchema.getUserGang(userId);
            gang = userGang;
        }

        if (!gang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Gang not found!', 'error')],
                ephemeral: true
            });
        }

        const members = GangSchema.getGangMembers(gang.id);
        const leader = members.find(m => m.role === 'leader');

        const embed = createEmbed(
            `Gang: ${gang.name}`,
            `**Leader:** <@${leader.id}>\n**Members:** ${members.length}\n**Vault:** ${config.currency.emoji} **${gang.vault.toLocaleString()}**\n**Level:** ${gang.level}\n**Experience:** ${gang.experience.toLocaleString()}\n**Created:** <t:${Math.floor(new Date(gang.created_at).getTime() / 1000)}:R>`,
            'primary'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleMembers(interaction) {
        const userId = interaction.user.id;
        const userGang = GangSchema.getUserGang(userId);

        if (!userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are not in a gang!', 'error')],
                ephemeral: true
            });
        }

        const members = GangSchema.getGangMembers(userGang.id);
        
        let description = '';
        members.forEach(member => {
            const roleEmoji = member.role === 'leader' ? '👑' : member.role === 'agent' ? '⭐' : '👤';
            description += `${roleEmoji} <@${member.id}> - ${member.role}\n`;
        });

        const embed = createEmbed(
            `${userGang.name} Members`,
            description || 'No members found',
            'primary'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleDeposit(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');

        const userGang = GangSchema.getUserGang(userId);
        if (!userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are not in a gang!', 'error')],
                ephemeral: true
            });
        }

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins!', 'error')],
                ephemeral: true
            });
        }

        try {
            UserSchema.addCoins(userId, -amount);
            GangSchema.updateGangVault(userGang.id, amount);

            const embed = createEmbed(
                'Deposit Successful!',
                `You deposited ${config.currency.emoji} **${amount}** ${config.currency.name} to the gang vault!`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error depositing to gang vault:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to deposit to gang vault.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleWithdraw(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');

        const userGang = GangSchema.getUserGang(userId);
        if (!userGang) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You are not in a gang!', 'error')],
                ephemeral: true
            });
        }

        if (userGang.role !== 'leader' && userGang.role !== 'agent') {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Only gang leaders and agents can withdraw from the vault!', 'error')],
                ephemeral: true
            });
        }

        const gang = GangSchema.getGang(userGang.id);
        if (gang.vault < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Gang vault does not have enough coins!', 'error')],
                ephemeral: true
            });
        }

        try {
            UserSchema.addCoins(userId, amount);
            GangSchema.updateGangVault(userGang.id, -amount);

            const embed = createEmbed(
                'Withdrawal Successful!',
                `You withdrew ${config.currency.emoji} **${amount}** ${config.currency.name} from the gang vault!`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error withdrawing from gang vault:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to withdraw from gang vault.', 'error')],
                ephemeral: true
            });
        }
    },

    async handlePromote(interaction) {
        const userId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const newRole = interaction.options.getString('role');

        const userGang = GangSchema.getUserGang(userId);
        if (!userGang || userGang.role !== 'leader') {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Only gang leaders can promote members!', 'error')],
                ephemeral: true
            });
        }

        const targetGang = GangSchema.getUserGang(targetUser.id);
        if (!targetGang || targetGang.id !== userGang.id) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'That user is not in your gang!', 'error')],
                ephemeral: true
            });
        }

        // Update member role (this would need a proper update method in schema)
        // For now, we'll simulate it by leaving and rejoining with new role
        try {
            GangSchema.leaveGang(targetUser.id);
            GangSchema.joinGang(targetUser.id, userGang.id, newRole);

            const embed = createEmbed(
                'Member Promoted!',
                `${targetUser.username} has been promoted to **${newRole}**!`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error promoting gang member:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to promote gang member.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleKick(interaction) {
        const userId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');

        const userGang = GangSchema.getUserGang(userId);
        if (!userGang || (userGang.role !== 'leader' && userGang.role !== 'agent')) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Only gang leaders and agents can kick members!', 'error')],
                ephemeral: true
            });
        }

        const targetGang = GangSchema.getUserGang(targetUser.id);
        if (!targetGang || targetGang.id !== userGang.id) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'That user is not in your gang!', 'error')],
                ephemeral: true
            });
        }

        if (targetGang.role === 'leader') {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You cannot kick the gang leader!', 'error')],
                ephemeral: true
            });
        }

        try {
            GangSchema.leaveGang(targetUser.id);

            // Remove gangstar role
            const gangstarRole = interaction.guild.roles.cache.get(config.roles.gangstar);
            if (gangstarRole) {
                const member = await interaction.guild.members.fetch(targetUser.id);
                await member.roles.remove(gangstarRole);
            }

            const embed = createEmbed(
                'Member Kicked!',
                `${targetUser.username} has been kicked from the gang!`,
                'warning'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error kicking gang member:', error);
            await interaction.reply({
                embeds: [createEmbed('Error', 'Failed to kick gang member.', 'error')],
                ephemeral: true
            });
        }
    },

    async handleLeaderboard(interaction) {
        const topGangs = GangSchema.getGangLeaderboard(10);
        
        let description = '';
        for (let i = 0; i < topGangs.length; i++) {
            const gang = topGangs[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            description += `${medal} **${gang.name}** - Level ${gang.level} (${gang.experience.toLocaleString()} XP)\n`;
        }

        const embed = createEmbed(
            'Gang Leaderboard',
            description || 'No gangs found',
            'primary'
        );

        await interaction.reply({ embeds: [embed] });
    }
};
