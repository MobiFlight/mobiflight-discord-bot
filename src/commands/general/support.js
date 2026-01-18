const {
	SlashCommandBuilder,
	DiscordjsError,
} = require('discord.js');
const { replyOrEditReply } = require('../../utilities');
const { createMenuCommandHelper } = require('../../menuCommandUtilities');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'support' });

const menuHelper = createMenuCommandHelper({
	envVarName: 'SUPPORT_ITEMS_PATH',
	customId: 'support-selector',
	placeholder: 'Select a support topic',
	logger,
});

module.exports = {
	init: () => {
		menuHelper.loadMenuItems();
		menuHelper.watchForMenuChanges();
	},
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('support')
		.setDescription('Sends support prompts to help users provide more details')
		.addStringOption((option) =>
			option
				.setName('topic')
				.setDescription('The name of the support topic to send')
				.setRequired(false),
		),
	async execute(interaction) {
		try {
			let topic = interaction.options.getString('topic') ?? null;

			if (topic === null) {
				topic = await menuHelper.promptForTopic(interaction);
			}

			const selectedItem = menuHelper.getMenuItems().find((item) => item.value === topic);

			if (selectedItem === undefined) {
				await replyOrEditReply(interaction, {
					content: `No support entry for ${topic} found`,
					ephemeral: true,
				});
				return;
			}

			const message = selectedItem.content.join('\n');

			await replyOrEditReply(interaction, {
				content: 'Support message sent!',
				components: [],
				ephemeral: true,
			});

			await interaction.channel.send({
				content: message,
			});
		}
		catch (error) {
			if (
				error instanceof DiscordjsError &&
				error.code === 'InteractionCollectorError'
			) {
				await replyOrEditReply(interaction, {
					content: 'No response received, canceling sending the support message',
					components: [],
					ephemeral: true,
				});
			}
			else {
				logger.error(`Unable to send support message: ${error}`, error);
				await replyOrEditReply(interaction, {
					content: `Unable to send support message: ${error}`,
					components: [],
					ephemeral: true,
				});
			}
		}
	},
};
