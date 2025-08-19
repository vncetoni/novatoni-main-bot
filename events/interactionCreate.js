const { Events, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { ReactionSchema, ShopSchema, UserSchema, GangSchema } = require('../database/schema.js');
const { createEmbed } = require('../utils/embeds.js');
const { db } = require('../database/database.js');
const config = require('../config/config.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                
                const errorEmbed = createEmbed(
                    'Error',
                    'There was an error while executing this command!',
                    'error'
                );

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }

        // Handle button interactions
        else if (interaction.isButton()) {
            const customId = interaction.customId;

            // Shop purchase buttons
            if (customId.startsWith('buy_')) {
                await handleShopPurchase(interaction);
            }
            
            // Reaction back buttons
            else if (customId.startsWith('reaction_back_')) {
                await handleReactionBack(interaction);
            }
        }

        // Handle modal submissions
        else if (interaction.type === InteractionType.ModalSubmit) {
            const customId = interaction.customId;

            if (customId === 'add_shop_item') {
                await handleAddShopItem(interaction);
            } else if (customId === 'add_auto_response') {
                await handleAddAutoResponse(interaction);
            } else if (customId === 'add_auto_react') {
                await handleAddAutoReact(interaction);
            }
        }
    }
};

async function handleShopPurchase(interaction) {
    const customId = interaction.customId;
    const itemId = parseInt(customId.split('_')[1]);
    const userId = interaction.user.id;

    try {
        // Ensure user exists
        UserSchema.createUser(userId, interaction.user.username);
        const userData = UserSchema.getUser(userId);

        // Get item details
        const items = ShopSchema.getItems();
        const item = items.find(i => i.id === itemId);

        if (!item) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Item not found!', 'error')],
                ephemeral: true
            });
        }

        // Check if user has enough coins
        if (userData.coins < item.price) {
            return interaction.reply({
                embeds: [createEmbed('Error', `You need ${config.currency.emoji} **${item.price}** ${config.currency.name} to purchase this item!`, 'error')],
                ephemeral: true
            });
        }

        // Check if it's a gang perk and user is in a gang
        if (item.type === 'gang_perk') {
            const userGang = GangSchema.getUserGang(userId);
            if (!userGang) {
                return interaction.reply({
                    embeds: [createEmbed('Error', 'You must be in a gang to purchase gang perks!', 'error')],
                    ephemeral: true
                });
            }

            // Check if gang already has this perk
            const gangPurchases = ShopSchema.getUserPurchases(userId).filter(p => p.gang_id === userGang.id);
            if (gangPurchases.some(p => p.item_id === itemId)) {
                return interaction.reply({
                    embeds: [createEmbed('Error', 'Your gang already has this perk!', 'error')],
                    ephemeral: true
                });
            }
        } else {
            // Check if user already has this perk
            const userPurchases = ShopSchema.getUserPurchases(userId);
            if (userPurchases.some(p => p.item_id === itemId && !p.gang_id)) {
                return interaction.reply({
                    embeds: [createEmbed('Error', 'You already have this perk!', 'error')],
                    ephemeral: true
                });
            }
        }

        // Process purchase
        UserSchema.addCoins(userId, -item.price);
        
        const gangId = item.type === 'gang_perk' ? GangSchema.getUserGang(userId)?.id : null;
        ShopSchema.purchaseItem(userId, itemId, gangId);

        // Add role if specified
        if (item.role_id) {
            try {
                const role = interaction.guild.roles.cache.get(item.role_id);
                if (role) {
                    const member = await interaction.guild.members.fetch(userId);
                    await member.roles.add(role);
                }
            } catch (error) {
                console.error('Error adding role:', error);
            }
        }

        const embed = createEmbed(
            'Purchase Successful!',
            `You have successfully purchased **${item.name}** for ${config.currency.emoji} **${item.price}** ${config.currency.name}!`,
            'success'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error processing shop purchase:', error);
        await interaction.reply({
            embeds: [createEmbed('Error', 'Failed to process purchase.', 'error')],
            ephemeral: true
        });
    }
}

async function handleReactionBack(interaction) {
    const customId = interaction.customId;
    const parts = customId.split('_');
    const reactionType = parts[2];
    const originalUserId = parts[3];

    if (interaction.user.id !== originalUserId) {
        return interaction.reply({
            embeds: [createEmbed('Error', 'You can only react back to someone who reacted to you!', 'error')],
            ephemeral: true
        });
    }

    try {
        // Get original message to find who initiated the reaction
        const message = interaction.message;
        const embed = message.embeds[0];
        const description = embed.description || embed.title || '';
        
        // Extract the target user from the original message
        const userMentionMatch = description.match(/<@(\d+)>/g);
        if (userMentionMatch && userMentionMatch.length >= 2) {
            const targetUserId = userMentionMatch[1].replace(/[<@>]/g, '');
            const targetUser = await interaction.client.users.fetch(targetUserId);

            // Update reaction count
            ReactionSchema.addReaction(interaction.user.id, targetUser.id, reactionType);
            const totalCount = ReactionSchema.getReactionCount(targetUser.id, reactionType);

            const actionMessages = {
                hug: `${interaction.user} hugs ${targetUser} back! 🤗`,
                kiss: `${interaction.user} kisses ${targetUser} back! 💋`,
                cuddle: `${interaction.user} cuddles ${targetUser} back! 🥰`
            };

            const replyEmbed = createEmbed(
                actionMessages[reactionType],
                '',
                'primary'
            );

            replyEmbed.setFooter({ 
                text: `${targetUser.username} has been ${reactionType}ed ${totalCount} times`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            });

            // Try to get a new GIF
            try {
                const axios = require('axios');
                const response = await axios.get(`https://api.waifu.pics/sfw/${reactionType}`);
                replyEmbed.setImage(response.data.url);
            } catch (error) {
                console.error('Error fetching reaction GIF:', error);
            }

            await interaction.reply({ embeds: [replyEmbed] });

            // Give XP
            UserSchema.addExperience(interaction.user.id, 5);
        }

    } catch (error) {
        console.error('Error handling reaction back:', error);
        await interaction.reply({
            embeds: [createEmbed('Error', 'Failed to process reaction back.', 'error')],
            ephemeral: true
        });
    }
}

async function handleAddShopItem(interaction) {
    try {
        const name = interaction.fields.getTextInputValue('item_name');
        const description = interaction.fields.getTextInputValue('item_description');
        const price = parseInt(interaction.fields.getTextInputValue('item_price'));
        const type = interaction.fields.getTextInputValue('item_type');
        const roleId = interaction.fields.getTextInputValue('item_role') || null;

        if (isNaN(price) || price <= 0) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Invalid price!', 'error')],
                ephemeral: true
            });
        }

        if (type !== 'perk' && type !== 'gang_perk') {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Type must be either "perk" or "gang_perk"!', 'error')],
                ephemeral: true
            });
        }

        // Insert into database
        const stmt = db.prepare(`
            INSERT INTO shop_items (name, description, price, type, role_id, icon)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(name, description, price, type, roleId, '🎁');

        const embed = createEmbed(
            'Shop Item Added!',
            `**${name}** has been added to the shop for ${config.currency.emoji} **${price}** ${config.currency.name}!`,
            'success'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error adding shop item:', error);
        await interaction.reply({
            embeds: [createEmbed('Error', 'Failed to add shop item.', 'error')],
            ephemeral: true
        });
    }
}

async function handleAddAutoResponse(interaction) {
    try {
        const triggerText = interaction.fields.getTextInputValue('trigger_text');
        const responseText = interaction.fields.getTextInputValue('response_text');
        const chance = parseFloat(interaction.fields.getTextInputValue('response_chance')) || 1.0;

        if (chance < 0 || chance > 1) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Chance must be between 0.0 and 1.0!', 'error')],
                ephemeral: true
            });
        }

        // Insert into database
        const stmt = db.prepare(`
            INSERT INTO auto_responses (trigger_text, response_text, chance)
            VALUES (?, ?, ?)
        `);
        
        stmt.run(triggerText, responseText, chance);

        const embed = createEmbed(
            'Auto Response Added!',
            `**Trigger:** "${triggerText}"\n**Response:** "${responseText}"\n**Chance:** ${Math.floor(chance * 100)}%`,
            'success'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error adding auto response:', error);
        await interaction.reply({
            embeds: [createEmbed('Error', 'Failed to add auto response.', 'error')],
            ephemeral: true
        });
    }
}

async function handleAddAutoReact(interaction) {
    try {
        const triggerText = interaction.fields.getTextInputValue('trigger_text');
        const emoji = interaction.fields.getTextInputValue('react_emoji');
        const chance = parseFloat(interaction.fields.getTextInputValue('react_chance')) || 1.0;

        if (chance < 0 || chance > 1) {
            return interaction.reply({
                embeds: [createEmbed('Error', 'Chance must be between 0.0 and 1.0!', 'error')],
                ephemeral: true
            });
        }

        // Insert into database
        const stmt = db.prepare(`
            INSERT INTO auto_reacts (trigger_text, emoji, chance)
            VALUES (?, ?, ?)
        `);
        
        stmt.run(triggerText, emoji, chance);

        const embed = createEmbed(
            'Auto React Added!',
            `**Trigger:** "${triggerText}"\n**Emoji:** ${emoji}\n**Chance:** ${Math.floor(chance * 100)}%`,
            'success'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error adding auto react:', error);
        await interaction.reply({
            embeds: [createEmbed('Error', 'Failed to add auto react.', 'error')],
            ephemeral: true
        });
    }
}
