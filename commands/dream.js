const { SlashCommandBuilder } = require("@discordjs/builders");
const { spawn } = require("child_process");
const Canvas = require("canvas");
const sizeOf = require("image-size");
const { MessageAttachment } = require("discord.js");
const sharp = require("sharp");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dream")
    .setDescription("Dreams about your image"),
  async execute(discord, state, interaction) {
    return interaction.reply("What shall I dream of?").then(() => {
      const filter = (m) => interaction.user.id === m.author.id;

      interaction.channel
        .awaitMessages({ filter, time: 60000, max: 1, errors: ["time"] })
        .then((messages) => {
          const firstMessage = messages.first();
          const attachments = Array.from(firstMessage.attachments.values());
          if (
            attachments.length === 0 ||
            !attachments[0].contentType.startsWith("image/")
          ) {
            return interaction.followUp(
              "That is not something I can dream to."
            );
          }

          // TODO: Set status to "dreaming"

          const imageUrl = attachments[0].url;

          state.queue.push({
            imageMessageId: firstMessage.id,
            channelId: interaction.channel.id,
            userId: interaction.member.id,
            imageUrl: imageUrl,
            options: {},
          });
          if (state.queue.length === 1) {
            generateNightmare(discord, state);
          }
        })
        .catch((e) => {
          console.warn(e);
          interaction.followUp("My desire to dream has expired.");
        });
    });
  },
};

function generateNightmare(discord, state) {
  console.log("generating nightmare");
  console.log(state);
  const queue = state.queue;
  const currentNightmare = queue[0];
  const imageUrl = currentNightmare.imageUrl;
  const options = currentNightmare.options;
  discord.channels.fetch(currentNightmare.channelId).then((channel) => {
    channel.messages
      .fetch(currentNightmare.imageMessageId)
      .then((imageMessage) => {
        discord.users.fetch(currentNightmare.userId).then((user) => {
          imageMessage.guild.members.fetch(user.id).then((guildUser) => {
            const userName = guildUser.displayName;
            imageMessage
              .startThread({
                name: `${userName}'s nightmare`,
                autoArchiveDuration: 1440, // 1 day
                reason: "Showing progress dreaming up a nightmare",
              })
              .then((threadChannel) => {
                const imageExtension = imageUrl.replace(
                  /.*\.([^.]{3,4})$/g,
                  "$1"
                );
                const inspirationPath = `./dream/inspiration-original.${imageExtension}`;
                const inspirationDownload = spawn("wget", [
                  "-O",
                  inspirationPath,
                  imageUrl,
                ]);
                inspirationDownload.on("close", async (code) => {
                  // Resize image if it's too large for darknet
                  const resizedInspirationPath = `./dream/inspiration.${imageExtension}`;
                  sharp.cache(false);
                  sharp(inspirationPath)
                    .resize(1024, 1024, {
                      fit: "inside",
                    })
                    .toFile(resizedInspirationPath)
                    .then(() => {
                      const layers = 10;
                      const nightmareProcess = spawn("./darknet/darknet", [
                        "nightmare",
                        "darknet/cfg/jnet-conv.cfg",
                        "darknet/jnet-conv.weights",
                        `${resizedInspirationPath}`,
                        layers.toString(),
                        "-iters",
                        "7",
                      ]);

                      nightmareProcess.stdout.on("data", (data) => {
                        const dataStr = data.toString().trim();
                        if (dataStr) {
                          threadChannel
                            .send(dataStr)
                            .then((message) =>
                              console.log(`Sent message: ${message.content}`)
                            )
                            .catch(console.error);
                        }
                      });

                      nightmareProcess.stderr.on("data", (data) => {
                        const dataStr = data.toString().trim();
                        if (dataStr) {
                          threadChannel
                            .send(dataStr)
                            .then((message) =>
                              console.log(
                                `Sent error message: ${message.content}`
                              )
                            )
                            .catch(console.error);
                        }
                      });

                      nightmareProcess.on("error", (error) => {
                        threadChannel.send(
                          "I had a restless night and could not procure any nightmares for you."
                        );
                        queue.shift();
                        console.error(`error: ${error.message}`);
                      });

                      nightmareProcess.on("close", async (code) => {

                        // Create the generated image as an attachment
                        // TODO: Add error checking, if file was not generated correctly
                        const nightmarePath = `./inspiration_jnet-conv_${layers}_000000.jpg`;
                        const dimensions = sizeOf(nightmarePath);
                        const canvas = Canvas.createCanvas(
                          dimensions.width,
                          dimensions.height
                        );
                        const context = canvas.getContext("2d");
                        const nightmare = await Canvas.loadImage(nightmarePath);
                        context.drawImage(
                          nightmare,
                          0,
                          0,
                          canvas.width,
                          canvas.height
                        );

                        const attachment = new MessageAttachment(
                          canvas.toBuffer(),
                          `nightmare.${imageExtension}`
                        );
                        threadChannel.send({
                          content: `<@${user.id}>`,
                          files: [attachment],
                        }).then(() => {
                          threadChannel
                            .send("Good morning")
                            .then((message) =>
                              console.log(`Sent message: ${message.content}`)
                            )
                            .catch(console.error);
                        });

                        fs.unlinkSync(inspirationPath);
                        fs.unlinkSync(resizedInspirationPath);
                        fs.unlinkSync(nightmarePath);

                        state.queue.shift();
                        if (state.queue.length > 0) {
                          generateNightmare(discord, state);
                        }
                      });
                    })
                    .catch(
                      console.error
                    );
                });
              })
              .catch(console.error);
          });
        });
      });
  });
}
