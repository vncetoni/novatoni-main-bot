const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ReactionSchema, UserSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reaction')
        .setDescription('SFW reaction commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('hug')
                .setDescription('Hug someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to hug')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kiss')
                .setDescription('Kiss someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to kiss')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cuddle')
                .setDescription('Cuddle with someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to cuddle')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pat')
                .setDescription('Pat someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to pat')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('poke')
                .setDescription('Poke someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to poke')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slap')
                .setDescription('Slap someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to slap')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bite')
                .setDescription('Bite someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to bite')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('yeet')
                .setDescription('Yeet someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to yeet')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bonk')
                .setDescription('Bonk someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to bonk')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('wave')
                .setDescription('Wave at someone')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to wave at')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const userId = interaction.user.id;

        // Ensure users exist in database
        UserSchema.createUser(userId, interaction.user.username);
        UserSchema.createUser(targetUser.id, targetUser.username);

        if (userId === targetUser.id) {
            const selfActions = {
                hug: 'You hug yourself... are you okay?',
                kiss: 'You kiss yourself in the mirror... narcissist much?',
                cuddle: 'You cuddle with your pillow...',
                pat: 'You pat yourself on the back!',
                poke: 'You poke yourself... weird...',
                slap: 'You slap yourself... that must hurt!',
                bite: 'You bite yourself... ouch!',
                yeet: 'You yeet yourself into the void!',
                bonk: 'You bonk yourself... confusion!',
                wave: 'You wave at your reflection!'
            };

            return interaction.reply({
                embeds: [createEmbed('Self Action', selfActions[subcommand], 'warning')],
                ephemeral: true
            });
        }

        await this.handleReaction(interaction, subcommand, targetUser);
    },

    async handleReaction(interaction, reactionType, targetUser) {
        try {
            await interaction.deferReply();

            // Get reaction GIF from waifu.pics API
            const response = await axios.get(`https://api.waifu.pics/sfw/${reactionType}`);
            const gifUrl = response.data.url;

            // Update reaction count
            ReactionSchema.addReaction(interaction.user.id, targetUser.id, reactionType);
            const totalCount = ReactionSchema.getReactionCount(targetUser.id, reactionType);

            // Create action messages
            const actionMessages = {
                hug: `${interaction.user} hugs ${targetUser}! 🤗`,
                kiss: `${interaction.user} kisses ${targetUser}! 💋`,
                cuddle: `${interaction.user} cuddles with ${targetUser}! 🥰`,
                pat: `${interaction.user} pats ${targetUser}! 👋`,
                poke: `${interaction.user} pokes ${targetUser}! 👉`,
                slap: `${interaction.user} slaps ${targetUser}! 👋`,
                bite: `${interaction.user} bites ${targetUser}! 😈`,
                yeet: `${interaction.user} yeets ${targetUser}! 🚀`,
                bonk: `${interaction.user} bonks ${targetUser}! 🔨`,
                wave: `${interaction.user} waves at ${targetUser}! 👋`
            };

            // Create embed directly with proper structure
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle(`${reactionType.charAt(0).toUpperCase() + reactionType.slice(1)} ✨`)
                .setDescription(actionMessages[reactionType])
                .setImage(gifUrl)
                .setColor(Math.floor(Math.random() * 16777215)) // Random color
                .setAuthor({
                    name: interaction.user.displayName,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setFooter({ 
                    text: `${targetUser.username} has been ${reactionType}ed ${totalCount} times`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Create interaction buttons for sweet reactions
            const sweetReactions = ['hug', 'kiss', 'cuddle'];
            let components = [];

            if (sweetReactions.includes(reactionType)) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`reaction_back_${reactionType}_${interaction.user.id}`)
                            .setLabel(`${reactionType.charAt(0).toUpperCase() + reactionType.slice(1)} back!`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(this.getReactionEmoji(reactionType))
                    );

                components = [row];
            }

            await interaction.editReply({ 
                embeds: [embed], 
                components: components 
            });

            // Give small XP reward
            UserSchema.addExperience(interaction.user.id, 5);

        } catch (error) {
            console.error('Error handling reaction:', error);
            
            // Fallback without GIF
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle(`${reactionType.charAt(0).toUpperCase() + reactionType.slice(1)} ✨`)
                .setDescription(actionMessages[reactionType] + '\n\n*GIF failed to load, but the gesture was appreciated!* ❤️')
                .setColor(0xFF6B6B) // Soft red color
                .setAuthor({
                    name: interaction.user.displayName,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setFooter({ 
                    text: `${targetUser.username} has been ${reactionType}ed ${totalCount} times`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    getReactionEmoji(reactionType) {
        const emojis = {
            hug: '🤗',
            kiss: '💋',
            cuddle: '🥰',
            pat: '👋',
            poke: '👉',
            slap: '👋',
            bite: '😈',
            yeet: '🚀',
            bonk: '🔨',
            wave: '👋'
        };

        return emojis[reactionType] || '❤️';
    }
};
