const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { UserSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your balance')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check balance for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Claim your daily reward'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('work')
                .setDescription('Work to earn coins'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rob')
                .setDescription('Rob another user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to rob')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Give coins to another user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to give coins to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to give')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the economy leaderboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Ensure user exists in database
        const userId = interaction.user.id;
        UserSchema.createUser(userId, interaction.user.username);

        switch (subcommand) {
            case 'balance':
                await this.handleBalance(interaction);
                break;
            case 'daily':
                await this.handleDaily(interaction);
                break;
            case 'work':
                await this.handleWork(interaction);
                break;
            case 'rob':
                await this.handleRob(interaction);
                break;
            case 'give':
                await this.handleGive(interaction);
                break;
            case 'leaderboard':
                await this.handleLeaderboard(interaction);
                break;
        }
    },

    async handleBalance(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        UserSchema.createUser(targetUser.id, targetUser.username);
        const userData = UserSchema.getUser(targetUser.id);

        const embed = createEmbed(
            `${targetUser.username}'s Balance`,
            `${config.currency.emoji} **${userData.coins.toLocaleString()}** ${config.currency.name}\n💎 **Level:** ${userData.level}\n⭐ **Experience:** ${userData.experience.toLocaleString()}/1000`,
            'primary'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleDaily(interaction) {
        const userId = interaction.user.id;
        const userData = UserSchema.getUser(userId);
        const now = new Date();
        const lastDaily = userData.daily_last ? new Date(userData.daily_last) : null;

        if (lastDaily && now - lastDaily < config.cooldowns.daily) {
            const timeLeft = config.cooldowns.daily - (now - lastDaily);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            const embed = createEmbed(
                'Daily Reward',
                `You can claim your daily reward in **${hours}h ${minutes}m**`,
                'error'
            );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const amount = config.currency.dailyAmount;
        UserSchema.addCoins(userId, amount);
        UserSchema.updateUser(userId, { daily_last: now.toISOString() });

        const embed = createEmbed(
            'Daily Reward Claimed!',
            `You received ${config.currency.emoji} **${amount}** ${config.currency.name}!`,
            'success'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleWork(interaction) {
        const userId = interaction.user.id;
        const userData = UserSchema.getUser(userId);
        const now = new Date();
        const lastWork = userData.work_last ? new Date(userData.work_last) : null;

        if (lastWork && now - lastWork < config.cooldowns.work) {
            const timeLeft = config.cooldowns.work - (now - lastWork);
            const minutes = Math.floor(timeLeft / (1000 * 60));

            const embed = createEmbed(
                'Work Cooldown',
                `You can work again in **${minutes} minutes**`,
                'error'
            );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const jobs = [
            'pizza delivery driver', 'dog walker', 'street performer', 'freelance coder',
            'coffee barista', 'uber driver', 'tutor', 'photographer'
        ];

        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const amount = Math.floor(Math.random() * 50) + 25; // 25-75 coins

        UserSchema.addCoins(userId, amount);
        UserSchema.updateUser(userId, { work_last: now.toISOString() });

        const embed = createEmbed(
            'Work Complete!',
            `You worked as a **${job}** and earned ${config.currency.emoji} **${amount}** ${config.currency.name}!`,
            'success'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleRob(interaction) {
        const userId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const targetId = targetUser.id;

        if (userId === targetId) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You cannot rob yourself!', 'error')],
                ephemeral: true
            });
        }

        UserSchema.createUser(targetId, targetUser.username);
        const userData = UserSchema.getUser(userId);
        const targetData = UserSchema.getUser(targetId);
        const now = new Date();
        const lastRob = userData.rob_last ? new Date(userData.rob_last) : null;

        if (lastRob && now - lastRob < config.cooldowns.rob) {
            const timeLeft = config.cooldowns.rob - (now - lastRob);
            const minutes = Math.floor(timeLeft / (1000 * 60));

            const embed = createEmbed(
                'Rob Cooldown',
                `You can rob again in **${minutes} minutes**`,
                'error'
            );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Check rob protection
        if (targetData.rob_protection_until && new Date(targetData.rob_protection_until) > now) {
            const embed = createEmbed(
                'Rob Failed',
                `${targetUser.username} is protected from robberies!`,
                'error'
            );

            return interaction.reply({ embeds: [embed] });
        }

        if (targetData.coins < 100) {
            const embed = createEmbed(
                'Rob Failed',
                `${targetUser.username} doesn't have enough coins to rob! (minimum 100)`,
                'error'
            );

            return interaction.reply({ embeds: [embed] });
        }

        const success = Math.random() < 0.6; // 60% success rate
        const amount = Math.floor(targetData.coins * 0.1); // 10% of target's coins

        UserSchema.updateUser(userId, { rob_last: now.toISOString() });

        if (success) {
            const finalAmount = userData.double_rob_until && new Date(userData.double_rob_until) > now ? amount * 2 : amount;
            
            UserSchema.addCoins(userId, finalAmount);
            UserSchema.addCoins(targetId, -finalAmount);

            const embed = createEmbed(
                'Rob Successful!',
                `You successfully robbed ${config.currency.emoji} **${finalAmount}** ${config.currency.name} from ${targetUser.username}!`,
                'success'
            );

            await interaction.reply({ embeds: [embed] });
        } else {
            const fine = Math.floor(userData.coins * 0.05); // 5% fine
            UserSchema.addCoins(userId, -fine);

            const embed = createEmbed(
                'Rob Failed!',
                `You got caught trying to rob ${targetUser.username} and paid ${config.currency.emoji} **${fine}** ${config.currency.name} as a fine!`,
                'error'
            );

            await interaction.reply({ embeds: [embed] });
        }
    },

    async handleGive(interaction) {
        const userId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const targetId = targetUser.id;
        const amount = interaction.options.getInteger('amount');

        if (userId === targetId) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You cannot give coins to yourself!', 'error')],
                ephemeral: true
            });
        }

        UserSchema.createUser(targetId, targetUser.username);
        const userData = UserSchema.getUser(userId);

        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins!', 'error')],
                ephemeral: true
            });
        }

        UserSchema.addCoins(userId, -amount);
        UserSchema.addCoins(targetId, amount);

        const embed = createEmbed(
            'Coins Transferred!',
            `You gave ${config.currency.emoji} **${amount}** ${config.currency.name} to ${targetUser.username}!`,
            'success'
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleLeaderboard(interaction) {
        const topUsers = UserSchema.getLeaderboard('coins', 10);
        
        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            description += `${medal} <@${user.id}> - ${config.currency.emoji} **${user.coins.toLocaleString()}**\n`;
        }

        const embed = createEmbed(
            `${config.currency.name} Leaderboard`,
            description || 'No users found',
            'primary'
        );

        await interaction.reply({ embeds: [embed] });
    }
};
