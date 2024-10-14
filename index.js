require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Load and set up the command files
const clanCommands = require('./clan.js');
const ticketCommands = require('./ticket.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Load from environment variables
const CLIENT_ID = process.env.CLIENT_ID; // Load from environment variables

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Login to Discord
client.login(DISCORD_TOKEN);