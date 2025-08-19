const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config/config.js');

// Register fonts if available
try {
    // You can add custom fonts here if you have them
    // registerFont('./assets/fonts/Roboto-Regular.ttf', { family: 'Roboto' });
} catch (error) {
    console.log('No custom fonts found, using default fonts');
}

async function generateProfileCard(user, userData, userGang = null) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Background
    await drawBackground(ctx, userData.profile_background);

    // User avatar
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        
        // Draw avatar with circular mask
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 70, 70, 160, 160);
        ctx.restore();

        // Avatar border
        ctx.strokeStyle = getNameplateColor(userData.profile_nameplate);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (error) {
        console.error('Error loading avatar:', error);
        // Draw placeholder circle
        ctx.fillStyle = '#7289da';
        ctx.beginPath();
        ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
        ctx.fill();
    }

    // Username
    ctx.fillStyle = getNameplateColor(userData.profile_nameplate);
    ctx.font = 'bold 36px Arial';
    ctx.fillText(user.username, 280, 100);

    // Level and experience
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`Level ${userData.level}`, 280, 140);

    // Experience bar
    const expProgress = (userData.experience % 1000) / 1000;
    const barWidth = 300;
    const barHeight = 20;
    const barX = 280;
    const barY = 160;

    // Background bar
    ctx.fillStyle = '#4f545c';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar
    ctx.fillStyle = '#7289da';
    ctx.fillRect(barX, barY, barWidth * expProgress, barHeight);

    // Experience text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`${userData.experience % 1000}/1000 XP`, barX + barWidth + 10, barY + 15);

    // Stats section
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    const stats = [
        `${config.currency.emoji} ${userData.coins.toLocaleString()} ${config.currency.name}`,
        `📝 ${userData.message_count.toLocaleString()} messages`,
        `🔊 ${Math.floor(userData.voice_time / 60)} hours voice`,
        userGang ? `⚔️ ${userGang.name} (${userGang.role})` : '⚔️ No gang'
    ];

    stats.forEach((stat, index) => {
        ctx.fillText(stat, 280, 220 + (index * 30));
    });

    // Decorative elements
    drawDecorations(ctx, userData.profile_background);

    return canvas.toBuffer();
}

async function drawBackground(ctx, backgroundType) {
    const canvas = ctx.canvas;
    
    switch (backgroundType) {
        case 'galaxy':
            // Galaxy gradient
            const galaxyGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            galaxyGradient.addColorStop(0, '#1a1a2e');
            galaxyGradient.addColorStop(0.5, '#16213e');
            galaxyGradient.addColorStop(1, '#0f3460');
            ctx.fillStyle = galaxyGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 2;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'ocean':
            // Ocean gradient
            const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            oceanGradient.addColorStop(0, '#87ceeb');
            oceanGradient.addColorStop(0.5, '#4682b4');
            oceanGradient.addColorStop(1, '#191970');
            ctx.fillStyle = oceanGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        case 'sunset':
            // Sunset gradient
            const sunsetGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            sunsetGradient.addColorStop(0, '#ff6b6b');
            sunsetGradient.addColorStop(0.5, '#ff8e53');
            sunsetGradient.addColorStop(1, '#ff6b9d');
            ctx.fillStyle = sunsetGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        case 'forest':
            // Forest gradient
            const forestGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            forestGradient.addColorStop(0, '#2d5016');
            forestGradient.addColorStop(0.5, '#3e6b1f');
            forestGradient.addColorStop(1, '#4f7942');
            ctx.fillStyle = forestGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        default:
            // Default gradient
            const defaultGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            defaultGradient.addColorStop(0, '#2c2f33');
            defaultGradient.addColorStop(1, '#23272a');
            ctx.fillStyle = defaultGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
    }
}

function getNameplateColor(nameplateType) {
    switch (nameplateType) {
        case 'gold':
            return '#ffd700';
        case 'silver':
            return '#c0c0c0';
        case 'rainbow':
            return '#ff6b6b'; // Simplified rainbow effect
        case 'neon':
            return '#00ff00';
        default:
            return '#7289da';
    }
}

function drawDecorations(ctx, backgroundType) {
    const canvas = ctx.canvas;
    
    // Add some decorative elements based on background
    switch (backgroundType) {
        case 'galaxy':
            // Add nebula effect
            ctx.globalAlpha = 0.3;
            const nebulaGradient = ctx.createRadialGradient(canvas.width * 0.8, canvas.height * 0.3, 50, canvas.width * 0.8, canvas.height * 0.3, 150);
            nebulaGradient.addColorStop(0, '#ff00ff');
            nebulaGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = nebulaGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
            break;

        case 'ocean':
            // Add wave pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(0, canvas.height - 50 + i * 10);
                for (let x = 0; x < canvas.width; x += 20) {
                    const y = canvas.height - 50 + i * 10 + Math.sin(x * 0.02) * 5;
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            break;
    }
}

async function generateGangBanner(gang, members) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2c2f33');
    gradient.addColorStop(1, '#23272a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gang name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gang.name, canvas.width / 2, 80);

    // Gang stats
    ctx.font = '24px Arial';
    const stats = [
        `Level ${gang.level}`,
        `${members.length} Members`,
        `${config.currency.emoji} ${gang.vault.toLocaleString()} in vault`
    ];

    stats.forEach((stat, index) => {
        ctx.fillText(stat, canvas.width / 2, 130 + (index * 30));
    });

    // Member avatars (top 5)
    const topMembers = members.slice(0, 5);
    const avatarSize = 50;
    const startX = (canvas.width - (topMembers.length * avatarSize + (topMembers.length - 1) * 10)) / 2;

    for (let i = 0; i < topMembers.length; i++) {
        try {
            const member = topMembers[i];
            const avatar = await loadImage(`https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png?size=128`);
            
            const x = startX + i * (avatarSize + 10);
            const y = 230;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, x, y, avatarSize, avatarSize);
            ctx.restore();

            // Role indicator
            const roleColors = { leader: '#ffd700', agent: '#c0c0c0', member: '#7289da' };
            ctx.strokeStyle = roleColors[member.role] || '#7289da';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.stroke();
        } catch (error) {
            console.error('Error loading member avatar:', error);
        }
    }

    return canvas.toBuffer();
}

module.exports = {
    generateProfileCard,
    generateGangBanner
};
