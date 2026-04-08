/**
 * @file index.ts
 * @description Discord bot for replaying MUME session logs.
 */

import { Client, GatewayIntentBits, Interaction, Attachment, Partials, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import { Replayer, SessionLog } from './replayer.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'replay') {
    const attachment = interaction.options.getAttachment('file');
    if (!attachment || !attachment.name.endsWith('.mume-log') && !attachment.name.endsWith('.json')) {
      return interaction.reply({ content: 'Please upload a valid `.mume-log` file.', ephemeral: true });
    }

    await interaction.reply({ content: 'Downloading log and preparing playback...', ephemeral: true });

    try {
      const response = await axios.get(attachment.url);
      const log = response.data as SessionLog;

      if (!log.entries || !Array.isArray(log.entries)) {
        return interaction.followUp({ content: 'Invalid session log format.', ephemeral: true });
      }

      await interaction.followUp({ content: 'Starting playback in this channel!', ephemeral: true });

      const channel = interaction.channel as TextChannel;
      const replayer = new Replayer(log, async (content) => {
        await channel.send(content);
      });

      console.log(`[Bot] Starting playback in ${channel.name}`);
      await replayer.start();

    } catch (err) {
      console.error('[Bot] Error during replay:', err);
      await interaction.followUp({ content: 'An error occurred while processing the replay file.', ephemeral: true });
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Bot] No DISCORD_TOKEN found in .env');
  process.exit(1);
}

client.login(token);
