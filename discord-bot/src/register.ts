/**
 * @file register.ts
 * @description Script to register Discord slash commands.
 */

import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('replay')
    .setDescription('Replay a MUME session log file in real-time')
    .addAttachmentOption(option => 
      option.setName('file')
        .setDescription('The .mume-log or .json file to replay')
        .setRequired(true)
    ),
].map(command => command.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('[Register] Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('[Register] Started refreshing application (/) commands.');

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`[Register] Successfully registered commands for guild ${guildId}`);
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('[Register] Successfully registered global commands.');
    }
  } catch (error) {
    console.error('[Register] Error refreshing commands:', error);
  }
})();
