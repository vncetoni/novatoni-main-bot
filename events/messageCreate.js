const { Events } = require('discord.js');
const { UserSchema } = require('../database/schema.js');
const { checkAutomod } = require('../utils/automod.js');
const { createEmbed } = require('../utils/embeds.js');
const { db } = require('../database/database.js');
const config = require('../config/config.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild?.id;

        // Check for prefix commands first
        if (message.content.startsWith(config.prefix)) {
            await handlePrefixCommand(message);
            return;
        }

        // Ensure user exists in database
        UserSchema.createUser(userId, message.author.username);

        // Check automod
        const automodResult = checkAutomod(message);
        if (automodResult.violation) {
            try {
                await message.delete();
                
                const embed = createEmbed(
                    'Message Removed',
                    `${message.author}, your message was removed for: **${automodResult.reason}**`,
                    'warning'
                );
                
                const warningMsg = await message.channel.send({ embeds: [embed] });
                
                // Delete warning after 5 seconds
                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 5000);

                return;
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }

        // Update message count and add experience
        UserSchema.updateUser(userId, { message_count: UserSchema.getUser(userId).message_count + 1 });
        const expResult = UserSchema.addExperience(userId, 5);

        // Send level up message
        if (expResult.levelUp) {
            const embed = createEmbed(
                '🎉 Level Up!',
                `${message.author} reached level **${expResult.newLevel}**!`,
                'success'
            );

            const levelUpMsg = await message.channel.send({ embeds: [embed] });
            
            // Delete level up message after 10 seconds
            setTimeout(() => {
                levelUpMsg.delete().catch(() => {});
            }, 10000);
        }

        // Check for auto responses
        await checkAutoResponses(message);

        // Check for auto reacts
        await checkAutoReacts(message);

        // Random currency drop
        if (Math.random() < 0.005) { // 0.5% chance per message
            const dropAmount = Math.floor(Math.random() * (config.currency.dropAmount.max - config.currency.dropAmount.min + 1)) + config.currency.dropAmount.min;
            
            const embed = createEmbed(
                '💰 Currency Drop!',
                `${config.currency.emoji} **${dropAmount}** ${config.currency.name} appeared! First to react gets it!`,
                'success'
            );

            const dropMsg = await message.channel.send({ embeds: [embed] });
            await dropMsg.react('💰');

            // Set up collector for the drop
            const filter = (reaction, user) => reaction.emoji.name === '💰' && !user.bot;
            const collector = dropMsg.createReactionCollector({ filter, max: 1, time: 30000 });

            collector.on('collect', (reaction, user) => {
                UserSchema.createUser(user.id, user.username);
                UserSchema.addCoins(user.id, dropAmount);

                const claimEmbed = createEmbed(
                    '💰 Currency Claimed!',
                    `${user} claimed ${config.currency.emoji} **${dropAmount}** ${config.currency.name}!`,
                    'success'
                );

                dropMsg.edit({ embeds: [claimEmbed] });

                // Delete after 5 seconds
                setTimeout(() => {
                    dropMsg.delete().catch(() => {});
                }, 5000);
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    dropMsg.delete().catch(() => {});
                }
            });
        }
    }
};

async function checkAutoResponses(message) {
    try {
        const autoResponses = db.prepare('SELECT * FROM auto_responses WHERE active = 1').all();
        
        for (const response of autoResponses) {
            if (message.content.toLowerCase().includes(response.trigger_text.toLowerCase())) {
                if (Math.random() <= response.chance) {
                    const embed = createEmbed(
                        'Auto Response',
                        response.response_text,
                        'primary'
                    );
                    
                    await message.channel.send({ embeds: [embed] });
                    break; // Only trigger one response per message
                }
            }
        }
    } catch (error) {
        console.error('Error checking auto responses:', error);
    }
}

async function checkAutoReacts(message) {
    try {
        const autoReacts = db.prepare('SELECT * FROM auto_reacts WHERE active = 1').all();
        
        for (const react of autoReacts) {
            if (message.content.toLowerCase().includes(react.trigger_text.toLowerCase())) {
                if (Math.random() <= react.chance) {
                    try {
                        await message.react(react.emoji);
                    } catch (error) {
                        console.error('Error adding auto react:', error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking auto reacts:', error);
    }
}

async function handlePrefixCommand(message) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Handle direct reaction commands
    const reactionTypes = ['hug', 'kiss', 'cuddle', 'pat', 'poke', 'slap', 'bite', 'yeet', 'bonk', 'wave'];
    if (reactionTypes.includes(commandName)) {
        await handleDirectReaction(message, commandName, args);
        return;
    }

    // Get the command from the client
    const command = message.client.commands.get(commandName);
    
    if (!command) return;

    try {
        // Create a fake interaction object that mimics slash command interaction
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            reply: async (options) => {
                if (typeof options === 'string') {
                    return message.channel.send(options);
                }
                return message.channel.send(options);
            },
            editReply: async (options) => {
                // For prefix commands, just send a new message
                if (typeof options === 'string') {
                    return message.channel.send(options);
                }
                return message.channel.send(options);
            },
            followUp: async (options) => {
                if (typeof options === 'string') {
                    return message.channel.send(options);
                }
                return message.channel.send(options);
            },
            deferReply: async () => {
                // For prefix commands, we don't need to defer
                return Promise.resolve();
            },
            options: {
                getString: (name) => args[0] || null,
                getUser: (name) => {
                    const userMention = args.find(arg => arg.startsWith('<@') && arg.endsWith('>'));
                    if (userMention) {
                        const userId = userMention.slice(2, -1).replace('!', '');
                        return message.guild.members.cache.get(userId)?.user || null;
                    }
                    return null;
                },
                getInteger: (name) => {
                    const num = parseInt(args[0]);
                    return isNaN(num) ? null : num;
                },
                getSubcommand: () => args[0] || null,
                getSubcommandGroup: () => null
            },
            isCommand: () => true,
            commandName: commandName
        };

        // Ensure user exists in database for commands that need it
        UserSchema.createUser(message.author.id, message.author.username);

        // Execute the command
        await command.execute(fakeInteraction);

    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error);
        
        const embed = createEmbed(
            'Command Error',
            'There was an error executing that command!',
            'error'
        );
        
        message.channel.send({ embeds: [embed] });
    }
}

async function handleDirectReaction(message, reactionType, args) {
    try {
        // Parse user mention from args
        let targetUser = null;
        
        if (args.length > 0) {
            const userMention = args[0];
            if (userMention.startsWith('<@') && userMention.endsWith('>')) {
                const userId = userMention.slice(2, -1).replace('!', '');
                targetUser = message.guild.members.cache.get(userId)?.user;
            }
        }

        if (!targetUser) {
            const embed = createEmbed(
                'Missing User',
                `Please mention a user to ${reactionType}! Example: \`.${reactionType} @someone\``,
                'error'
            );
            return message.channel.send({ embeds: [embed] });
        }

        // Check if user is trying to react to themselves
        if (message.author.id === targetUser.id) {
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

            const embed = createEmbed('Self Action', selfActions[reactionType], 'warning');
            return message.channel.send({ embeds: [embed] });
        }

        // Create fake interaction object
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            deferReply: async () => Promise.resolve(),
            editReply: async (options) => {
                if (typeof options === 'string') {
                    return message.channel.send(options);
                }
                return message.channel.send(options);
            }
        };

        // Get the reaction command and call its handleReaction method
        const reactionCommand = message.client.commands.get('reaction');
        if (reactionCommand && reactionCommand.handleReaction) {
            await reactionCommand.handleReaction(fakeInteraction, reactionType, targetUser);
        }

    } catch (error) {
        console.error(`Error handling direct reaction ${reactionType}:`, error);
        
        const embed = createEmbed(
            'Reaction Error',
            'There was an error with that reaction!',
            'error'
        );
        
        message.channel.send({ embeds: [embed] });
    }
}
