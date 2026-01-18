const { SlashCommandBuilder } = require('discord.js');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'mods' });

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('mods')
		.setDescription('Moderator commands')
		.addSubcommand(subcommand =>
			subcommand
				.setName('details')
				.setDescription('Prompts the user to provide more details about their problem')),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'details') {
			await executeDetailsCommand(interaction);
		}
	},
};

async function executeDetailsCommand(interaction) {
	try {
		const detailsMessage = `☝️ **Please tell us more specifics about your problem**
* MobiFlight version?
* Sim?
* Airplane?
* Used Controller?
* Did you create your config, or is it from somebody else?
* Status Sim Connection? green?

🧪 **What did you try already?**
🖼️ **Take screenshots** of your config (WIN + Shift + S) and share them here.

💡 **Good to know:**
→ [Getting started guide](https://github.com/MobiFlight/MobiFlight-Connector/wiki)
→ [How to search our Discord](https://support.discord.com/hc/en-us/articles/115000468588-Using-Search)
→ [Enable logging for more details](https://github.com/MobiFlight/MobiFlight-Connector/wiki/Providing-logs-from-MobiFlight)
→ [Taking screenshots in Windows](https://support.microsoft.com/en-us/windows/use-snipping-tool-to-capture-screenshots-00246869-1843-655f-f220-97299b865f6b)`;

		await interaction.reply({
			content: 'Details prompt sent!',
			ephemeral: true,
		});

		await interaction.channel.send({
			content: detailsMessage,
		});
	}
	catch (error) {
		logger.error(`Unable to send details prompt: ${error}`, error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: `Unable to send details prompt: ${error}`,
				ephemeral: true,
			});
		}
		else {
			await interaction.reply({
				content: `Unable to send details prompt: ${error}`,
				ephemeral: true,
			});
		}
	}
}
