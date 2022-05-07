const fs = require("node:fs");
const Discord = require("discord.js");
const { discordBotToken } = require("./config.json");

/* Set up base state variable */

let state = {
	queue: [
		/* Example entry
			{
				channelId: 1234567890,			// The channel the bot was summoned in
				userId: 1234567890,				// Discord user ID
				threadId: 1234567890,				// Thread ID
				imageUrl: 'https://example.com/image.jpg',	// Inspiration image URL
				options: {}									// Custom darknet options
			}
		*/
	]
}

/* Set up Discord bot */

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.GUILD_WEBHOOKS,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
  ]
});

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(client, state, interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(discordBotToken);
