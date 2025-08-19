# Overview

This is a Discord bot built with Node.js that provides a comprehensive economy and social interaction system for Discord servers. The bot features user profiles, currency management, gangs, moderation tools, gambling games, reaction commands, and various social features. It's designed to enhance server engagement through gamification elements like experience points, levels, leaderboards, and an in-game economy.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework and Core Structure
- **Discord.js v14**: Main framework for Discord API interactions with comprehensive intent handling
- **Modular Command System**: Commands organized by category (admin, economy, gambling, gangs, moderation, profile, reactions) using slash command builders
- **Event-Driven Architecture**: Separate event handlers for message creation, voice state updates, and interaction handling

## Database Layer
- **SQLite with better-sqlite3**: Primary database for local data storage with WAL mode enabled for performance
- **Dual Database Support**: Infrastructure includes both local SQLite and cloud-ready setup with Neon PostgreSQL through Drizzle ORM
- **Schema Organization**: Centralized database schemas for users, gangs, shop items, reactions, and moderation data
- **Auto-initialization**: Database tables created automatically on startup with proper foreign key relationships

## Economy System
- **Virtual Currency**: NOVACOIN system with daily rewards, work commands, and gambling mechanics
- **Experience and Leveling**: User progression system with experience gained from messages and voice activity
- **Shop System**: Purchasable perks including rob protection, profile customizations, and VIP status
- **Anti-exploitation**: Cooldown systems and validation to prevent abuse

## Gang System
- **Guild-like Organizations**: Users can create/join gangs with shared vaults and hierarchical roles
- **Leadership Structure**: Gang leaders, officers, and members with different permission levels
- **Collaborative Features**: Shared resources and gang-specific commands

## Moderation and Security
- **Automod System**: Automated content filtering with configurable rules for spam, bad words, mentions, and links
- **Jail System**: Temporary punishment system with appeal mechanisms
- **Rate Limiting**: Built-in spam protection with configurable thresholds
- **Permission-based Commands**: Role and permission checks for administrative functions

## User Interaction Features
- **Profile System**: Customizable user profiles with canvas-generated profile cards
- **Reaction Commands**: Social interaction commands (hug, kiss, pat, etc.) with anime GIF integration
- **Leaderboards**: Automated leaderboard updates for messages, voice time, and gang rankings
- **Auto-responses**: Configurable automatic responses to common phrases

## Visual and Presentation Layer
- **Canvas Integration**: Dynamic image generation for profile cards with customizable themes
- **Rich Embeds**: Consistent embed styling across all bot responses with color-coded message types
- **Interactive Components**: Button-based interfaces for shop purchases and menu navigation

# External Dependencies

## Core Discord Infrastructure
- **Discord.js**: Primary Discord API wrapper with full v14 feature support
- **Discord API Types**: Type definitions for Discord API interactions

## Database and ORM
- **better-sqlite3**: High-performance SQLite database driver for local storage
- **Neon Database**: Cloud PostgreSQL database service for scalable deployment
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries

## Image Processing and Generation
- **Canvas**: HTML5 Canvas API implementation for server-side image generation
- **Sharp**: High-performance image processing for profile picture manipulation
- **Jimp**: Additional image processing capabilities for advanced graphics

## External API Integration
- **Axios**: HTTP client for fetching anime GIFs and external API calls
- **Cheerio**: Web scraping capabilities for content fetching

## Utility and Enhancement
- **Moment.js**: Date and time manipulation for cooldowns and timestamps
- **Node-cron**: Scheduled task management for leaderboard updates
- **Winston**: Comprehensive logging system for error tracking and debugging
- **Lodash**: Utility functions for data manipulation
- **UUID**: Unique identifier generation for database records

## Security and Validation
- **bcrypt**: Password hashing for secure authentication features
- **Joi/Yup**: Input validation and schema validation
- **Helmet**: Security middleware for web-based features
- **Crypto**: Built-in cryptographic functions for secure operations

## Development and Deployment
- **dotenv**: Environment variable management for configuration
- **fs-extra**: Enhanced filesystem operations
- **CORS**: Cross-origin resource sharing for web interface compatibility