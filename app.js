const fs = require("fs");
const Discord = require("discord.js");

const discordApi = require("./discord-api");

const config = require("./config.json");

/* Set up Discord bot */

const client = new Discord.Client();

/*
client.commands = new Discord.Collection();
const commandFiles = fs
  .readdirSync("./bot-commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./bot-commands/${file}`);
  client.commands.set(command.name, command);
}
*/

client.once("ready", () => {
  console.info("Discord bot is up!");
});

client.on("message", (message) => {
  discordApi.onMessage(message);
});

client.login(config.discord_bot_token);