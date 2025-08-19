const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { UserSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const config = require('../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gambling commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('coinflip')
                .setDescription('Flip a coin and bet on the outcome')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('choice')
                        .setDescription('Choose heads or tails')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Heads', value: 'heads' },
                            { name: 'Tails', value: 'tails' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dice')
                .setDescription('Roll dice and bet on the outcome')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('guess')
                        .setDescription('Guess the dice roll (1-6)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(6)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slots')
                .setDescription('Play the slot machine')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blackjack')
                .setDescription('Play blackjack')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roulette')
                .setDescription('Play roulette')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('bet')
                        .setDescription('What to bet on')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Red', value: 'red' },
                            { name: 'Black', value: 'black' },
                            { name: 'Green (0)', value: 'green' }
                        ))),

    async execute(interaction) {
        // Check if in gambling channel
        if (config.channels.gambling && interaction.channelId !== config.channels.gambling) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Gambling commands can only be used in the designated gambling channel!', 'error')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Ensure user exists in database
        UserSchema.createUser(userId, interaction.user.username);

        switch (subcommand) {
            case 'coinflip':
                await this.handleCoinflip(interaction);
                break;
            case 'dice':
                await this.handleDice(interaction);
                break;
            case 'slots':
                await this.handleSlots(interaction);
                break;
            case 'blackjack':
                await this.handleBlackjack(interaction);
                break;
            case 'roulette':
                await this.handleRoulette(interaction);
                break;
        }
    },

    async handleCoinflip(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const choice = interaction.options.getString('choice');

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins to place this bet!', 'error')],
                ephemeral: true
            });
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choice;

        if (won) {
            UserSchema.addCoins(userId, amount); // Double the bet (original + winnings)
            const embed = createEmbed(
                '🪙 Coinflip - You Won!',
                `The coin landed on **${result}**!\nYou won ${config.currency.emoji} **${amount}** ${config.currency.name}!`,
                'success'
            );
            await interaction.reply({ embeds: [embed] });
        } else {
            UserSchema.addCoins(userId, -amount);
            const embed = createEmbed(
                '🪙 Coinflip - You Lost!',
                `The coin landed on **${result}**!\nYou lost ${config.currency.emoji} **${amount}** ${config.currency.name}!`,
                'error'
            );
            await interaction.reply({ embeds: [embed] });
        }

        UserSchema.addExperience(userId, 10);
    },

    async handleDice(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const guess = interaction.options.getInteger('guess');

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins to place this bet!', 'error')],
                ephemeral: true
            });
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        const won = roll === guess;

        if (won) {
            const winnings = amount * 5; // 5x multiplier for correct guess
            UserSchema.addCoins(userId, winnings);
            const embed = createEmbed(
                '🎲 Dice - Jackpot!',
                `The dice rolled **${roll}**!\nYou guessed correctly and won ${config.currency.emoji} **${winnings}** ${config.currency.name}!`,
                'success'
            );
            await interaction.reply({ embeds: [embed] });
        } else {
            UserSchema.addCoins(userId, -amount);
            const embed = createEmbed(
                '🎲 Dice - You Lost!',
                `The dice rolled **${roll}**!\nYou guessed **${guess}** and lost ${config.currency.emoji} **${amount}** ${config.currency.name}!`,
                'error'
            );
            await interaction.reply({ embeds: [embed] });
        }

        UserSchema.addExperience(userId, 10);
    },

    async handleSlots(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins to place this bet!', 'error')],
                ephemeral: true
            });
        }

        const symbols = ['🍎', '🍊', '🍋', '🍇', '🍓', '💎', '⭐', '💰'];
        const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
        const slot3 = symbols[Math.floor(Math.random() * symbols.length)];

        let winnings = 0;
        let resultMessage = '';

        if (slot1 === slot2 && slot2 === slot3) {
            // Jackpot!
            if (slot1 === '💰') {
                winnings = amount * 10;
                resultMessage = 'MEGA JACKPOT!';
            } else if (slot1 === '💎') {
                winnings = amount * 8;
                resultMessage = 'DIAMOND JACKPOT!';
            } else if (slot1 === '⭐') {
                winnings = amount * 6;
                resultMessage = 'STAR JACKPOT!';
            } else {
                winnings = amount * 4;
                resultMessage = 'JACKPOT!';
            }
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            // Two matching
            winnings = Math.floor(amount * 1.5);
            resultMessage = 'Two matching!';
        } else {
            // No match
            winnings = -amount;
            resultMessage = 'No match!';
        }

        UserSchema.addCoins(userId, winnings);

        const embed = createEmbed(
            '🎰 Slot Machine',
            `${slot1} | ${slot2} | ${slot3}\n\n**${resultMessage}**\n${winnings > 0 ? `You won ${config.currency.emoji} **${winnings}** ${config.currency.name}!` : `You lost ${config.currency.emoji} **${Math.abs(winnings)}** ${config.currency.name}!`}`,
            winnings > 0 ? 'success' : 'error'
        );

        await interaction.reply({ embeds: [embed] });
        UserSchema.addExperience(userId, 10);
    },

    async handleBlackjack(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins to place this bet!', 'error')],
                ephemeral: true
            });
        }

        // Simple blackjack simulation
        const getCard = () => Math.floor(Math.random() * 10) + 1;
        const playerCard1 = getCard();
        const playerCard2 = getCard();
        const dealerCard = getCard();

        const playerTotal = playerCard1 + playerCard2;
        const dealerTotal = dealerCard + getCard(); // Dealer draws second card

        let result = '';
        let winnings = 0;

        if (playerTotal === 21) {
            winnings = amount * 2;
            result = 'BLACKJACK!';
        } else if (playerTotal > 21) {
            winnings = -amount;
            result = 'BUST!';
        } else if (dealerTotal > 21) {
            winnings = amount;
            result = 'Dealer busts!';
        } else if (playerTotal > dealerTotal) {
            winnings = amount;
            result = 'You win!';
        } else if (playerTotal < dealerTotal) {
            winnings = -amount;
            result = 'Dealer wins!';
        } else {
            winnings = 0;
            result = 'Push (tie)!';
        }

        UserSchema.addCoins(userId, winnings);

        const embed = createEmbed(
            '🃏 Blackjack',
            `**Your cards:** ${playerCard1} + ${playerCard2} = **${playerTotal}**\n**Dealer cards:** ${dealerCard} + ? = **${dealerTotal}**\n\n**${result}**\n${winnings > 0 ? `You won ${config.currency.emoji} **${winnings}** ${config.currency.name}!` : winnings < 0 ? `You lost ${config.currency.emoji} **${Math.abs(winnings)}** ${config.currency.name}!` : 'No money exchanged!'}`,
            winnings > 0 ? 'success' : winnings < 0 ? 'error' : 'warning'
        );

        await interaction.reply({ embeds: [embed] });
        UserSchema.addExperience(userId, 10);
    },

    async handleRoulette(interaction) {
        const userId = interaction.user.id;
        const amount = interaction.options.getInteger('amount');
        const bet = interaction.options.getString('bet');

        const userData = UserSchema.getUser(userId);
        if (userData.coins < amount) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'You do not have enough coins to place this bet!', 'error')],
                ephemeral: true
            });
        }

        const number = Math.floor(Math.random() * 37); // 0-36
        let color = '';
        
        if (number === 0) {
            color = 'green';
        } else if ([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number)) {
            color = 'red';
        } else {
            color = 'black';
        }

        let winnings = 0;
        let result = '';

        if (bet === color) {
            if (color === 'green') {
                winnings = amount * 35; // 35:1 for green
                result = 'GREEN JACKPOT!';
            } else {
                winnings = amount * 2; // 2:1 for red/black
                result = `${color.toUpperCase()} wins!`;
            }
        } else {
            winnings = -amount;
            result = `${color.toUpperCase()} wins - you lose!`;
        }

        UserSchema.addCoins(userId, winnings);

        const embed = createEmbed(
            '🎡 Roulette',
            `The ball landed on **${number}** (${color.toUpperCase()})!\n\n**${result}**\n${winnings > 0 ? `You won ${config.currency.emoji} **${winnings}** ${config.currency.name}!` : `You lost ${config.currency.emoji} **${Math.abs(winnings)}** ${config.currency.name}!`}`,
            winnings > 0 ? 'success' : 'error'
        );

        await interaction.reply({ embeds: [embed] });
        UserSchema.addExperience(userId, 10);
    }
};
