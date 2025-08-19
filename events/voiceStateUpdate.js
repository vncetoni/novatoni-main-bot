const { Events } = require('discord.js');
const { UserSchema } = require('../database/schema.js');

const voiceSessions = new Map(); // Track voice session start times

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.id || oldState.id;
        const member = newState.member || oldState.member;

        if (!member || member.user.bot) return;

        // Ensure user exists in database
        UserSchema.createUser(userId, member.user.username);

        // User joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            voiceSessions.set(userId, Date.now());
        }
        
        // User left a voice channel
        else if (oldState.channelId && !newState.channelId) {
            const sessionStart = voiceSessions.get(userId);
            if (sessionStart) {
                const sessionDuration = Date.now() - sessionStart;
                const sessionMinutes = Math.floor(sessionDuration / 60000);
                
                // Update voice time in database (stored in minutes)
                const userData = UserSchema.getUser(userId);
                UserSchema.updateUser(userId, { 
                    voice_time: userData.voice_time + sessionMinutes 
                });

                // Add experience for voice activity
                const expGained = Math.floor(sessionMinutes / 5) * 10; // 10 exp per 5 minutes
                if (expGained > 0) {
                    UserSchema.addExperience(userId, expGained);
                }

                voiceSessions.delete(userId);
            }
        }
        
        // User switched voice channels
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // Don't need to do anything special, keep the session running
        }
    }
};
