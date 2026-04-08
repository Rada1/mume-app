# MUME Discord Replay Bot

This bot allows you to replay recorded MUME session logs (`.mume-log`) directly into a Discord channel in real-time.

## Features
- **Real-time playback**: Matches the timing of the original recorded session.
- **Smart Batching**: Groups rapid messages to stay under Discord's 2000-character limit and avoid rate limits.
- **ANSI Support**: Preserves ANSI color codes using Discord's ```ansi``` code blocks.

## Setup

1.  **Create a Discord Bot**:
    - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Create a New Application.
    - Go to **Bot** and click **Add Bot**.
    - Copy your **Bot Token**.
    - Go to **OAuth2** -> **General** and copy your **Client ID**.

2.  **Environment Variables**:
    - Copy `.env.example` to `.env`.
    - Fill in `DISCORD_TOKEN` and `CLIENT_ID`.
    - (Optional) Fill in `GUILD_ID` for faster command registration in your test server.

3.  **Install Dependencies**:
    ```bash
    cd discord-bot
    npm install
    ```

4.  **Register Commands**:
    ```bash
    npm run register
    ```

5.  **Run the Bot**:
    ```bash
    npm run dev
    ```

## Usage

1.  Invite the bot to your server.
2.  In any text channel, use: `/replay`
3.  Attach your `.mume-log` file.
4.  Watch the session play back in real-time!
