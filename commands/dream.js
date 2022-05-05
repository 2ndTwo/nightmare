const { SlashCommandBuilder } = require('@discordjs/builders');
const { spawn } = require("child_process");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dream')
		.setDescription('Dreams about your image'),
	async execute(interaction) {
		return interaction.reply('What shall I dream of?').then(() => {
			const filter = m => interaction.user.id === m.author.id;

			interaction.channel.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] })
				.then(messages => {
					const firstMessage = messages.first();
					const attachments = Array.from(firstMessage.attachments.values());
					if (attachments.length === 0 || !attachments[0].contentType.startsWith('image/')) {
						return interaction.followUp('That is not something I can dream to.');
					}

					// Set status to "dreaming"

					const imageUrl = attachments[0].url;
					const imageExtension = imageUrl.replace(/.*\.([^.]{3,4})$/g, '$1');
					const imageDownload = spawn('wget', ['-O', `./dream/inspiration.${imageExtension}`, imageUrl]);

					imageDownload.on('close', code => {

						//interaction.followUp(`You've entered: ${messages.first().content}`);
						const channel = interaction.channel;
						const userName = interaction.member.displayName;
						channel.threads.create({
							name: `${userName}'s nightmare`,
							autoArchiveDuration: 1440,	// 1 day
							reason: 'Showing progress dreaming up a nightmare'
						}).then(threadChannel => {
							const nightmareProcess = spawn('./darknet/darknet', ['nightmare', 'darknet/cfg/vgg-conv.cfg', 'darknet/vgg-conv.weights', `dream/${imageExtension}`, '10']);

							nightmareProcess.stdout.on('data', data => {
								threadChannel.send(data)
									.then(message => console.log(`Sent message: ${message.content}`))
									.catch(console.error);
							});

							nightmareProcess.stderr.on('data', data => {
								console.log(`stderr: ${data}`);
								threadChannel.send(data)
									.then(message => console.log(`Sent error message: ${message.content}`))
									.catch(console.error);
							});

							nightmareProcess.on('error', (error) => {
								console.error(`error: ${error.message}`);
							});

							nightmareProcess.on('close', (code) => {
								threadChannel.send('Good morning')
									.then(message => console.log(`Sent message: ${message.content}`))
									.catch(console.error);
							});
						})
						.catch(console.error);
					})

				})
				.catch((e) => {
					console.warn(e);
					interaction.followUp('My desire to dream has expired.');
				});
		});
	},
};
