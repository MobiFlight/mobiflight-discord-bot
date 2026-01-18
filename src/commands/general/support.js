const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { replyOrEditReply } = require('../../utilities');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'support' });

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Support commands')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand(subcommand =>
			subcommand
				.setName('more-infos')
				.setDescription('Prompts the user to provide more details about their problem')),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'more-infos') {
			await executeMoreInfosCommand(interaction);
		}
	},
};

async function executeMoreInfosCommand(interaction) {
	try {
		const detailsMessage = `☝️ **Please tell us more specifics about your problem**
* **MobiFlight version?** (e.g., Latest Stable / Latest Beta / 10.3.2.1)
* **Sim?** (e.g., MSFS2020 / MSFS2024 / X-Plane / P3D / FSX)
* **Airplane?** (e.g., FBW A320nx / PMDG 737 / Fenix A320)
* **Used Controller?** (e.g., MobiFlight Mega / WinWing PAP-3 / Arduino Nano)
* **Did you create your config, or is it from somebody else?**
* **Status Sim Connection? green?**

🧪 **What did you try already?**
🖼️ **Take screenshots** of your config (WIN + Shift + S) and share them here.

💡 **Good to know:**
→ [Getting started guide](https://docs.mobiflight.com/getting-started/)
→ [How to search our Discord](https://support.discord.com/hc/en-us/articles/115000468588-Using-Search)
→ [Sharing logs](https://docs.mobiflight.com/guides/sharing-logs/)
→ [Taking screenshots](https://docs.mobiflight.com/guides/taking-screenshots/)`;

		await replyOrEditReply(interaction, {
			content: 'Details prompt sent!',
			ephemeral: true,
		});

		await interaction.channel.send({
			content: detailsMessage,
		});
	}
	catch (error) {
		logger.error(`Unable to send details prompt: ${error}`, error);
		await replyOrEditReply(interaction, {
			content: `Unable to send details prompt: ${error}`,
			ephemeral: true,
		});
	}
}
