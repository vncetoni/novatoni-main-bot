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
