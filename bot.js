const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.js');
const db = require('./database/database.js');

// Check for required environment variables
if (!config.token) {
    console.error('Error: DISCORD_TOKEN environment variable is not set!');
    console.error('Please set your Discord bot token as DISCORD_TOKEN in your environment variables.');
    process.exit(1);
}

// Initialize database
db.initializeDatabase();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection();
client.buttons = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
console.log('Loading commands from:', commandsPath);
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
console.log('Found command files:', commandFiles);
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    console.log('Loading command:', filePath);
    
    try {
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`❌ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error.message);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
console.log('Loading events from:', eventsPath);
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
console.log('Found event files:', eventFiles);

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    console.log('Loading event:', filePath);
    
    try {
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`✅ Loaded event: ${event.name}`);
    } catch (error) {
        console.error(`❌ Error loading event ${file}:`, error.message);
    }
}

// Register slash commands
client.once(Events.ClientReady, async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    const rest = new REST().setToken(config.token);
    
    try {
        console.log('Started refreshing application (/) commands.');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
    
    // Start periodic tasks
    setInterval(() => {
        require('./utils/leaderboards.js').updateLeaderboards(client);
    }, 300000); // Update every 5 minutes
    
    // Random currency drops
    setInterval(() => {
        const guilds = client.guilds.cache;
        guilds.forEach(guild => {
            const channels = guild.channels.cache.filter(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages'));
            if (channels.size > 0) {
                const randomChannel = channels.random();
                if (Math.random() < 0.1) { // 10% chance every interval
                    require('./utils/embeds.js').sendRandomDrop(randomChannel);
                }
            }
        });
    }, 60000); // Check every minute
});

client.login(config.token);
