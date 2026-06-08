import os
import discord
from discord import app_commands

class ActivityCommandTree(app_commands.CommandTree):
    async def sync(self, *, guild = None):
        # If we are syncing globally (guild is None)
        if guild is None:
            try:
                # 1. Fetch current global commands from Discord's API
                existing_commands = await self.client.http.get_global_commands(self.client.application_id)
            except Exception as e:
                print(f"Warning: Could not fetch existing commands: {e}")
                existing_commands = []
            
            # Find the primary entry point command (type 4) if it exists
            entry_point = next((cmd for cmd in existing_commands if cmd.get('type') == 4), None)
            
            # 2. Get local commands payload
            local_commands = self._get_all_commands(guild=None)
            payload_data = [cmd.to_dict(self) for cmd in local_commands]
            
            # 3. If the Entry Point command exists, append it to the bulk upsert payload
            if entry_point:
                print(f"Preserving existing Activity Entry Point command: {entry_point['name']}")
                payload_data.append({
                    "id": entry_point["id"],
                    "name": entry_point["name"],
                    "description": entry_point.get("description", ""),
                    "type": 4,
                    "application_id": entry_point["application_id"],
                    "version": entry_point["version"],
                    "integration_types": entry_point.get("integration_types", [0, 1]),
                    "contexts": entry_point.get("contexts", [0, 1, 2])
                })
                
                # Perform the bulk upsert manually
                data = await self.client.http.bulk_upsert_global_commands(self.client.application_id, payload_data)
                return [discord.app_commands.AppCommand(data=d, state=self._state) for d in data]

        # Fallback to standard sync behavior
        return await super().sync(guild=guild)

class MobileLaunchBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(intents=intents)
        # Use our custom CommandTree that preserves the Activity Entry Point
        self.tree = ActivityCommandTree(self)

    async def on_ready(self):
        print(f"Logged in as {self.user} (ID: {self.user.id})")
        try:
            synced = await self.tree.sync()
            print(f"Successfully synced {len(synced)} command(s) globally.")
        except Exception as e:
            print(f"Failed to sync commands: {e}")

bot = MobileLaunchBot()

@bot.tree.command(name="mobile", description="Launch MUME Mobile Discord Activity")
@app_commands.allowed_contexts(guilds=True, dms=True, private_channels=True)
@app_commands.allowed_installs(guilds=True, users=True)
async def mobile(interaction: discord.Interaction):
    try:
        await interaction.response.launch_activity()
    except Exception as e:
        await interaction.response.send_message(
            f"❌ Failed to launch activity: {e}", 
            ephemeral=True
        )

if __name__ == "__main__":
    # Get the token from an environment variable, or paste it directly below
    BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    
    if BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("⚠️ Please replace 'YOUR_BOT_TOKEN_HERE' with your actual bot token.")
        
    bot.run(BOT_TOKEN)
