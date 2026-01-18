const {
	SlashCommandBuilder,
	DiscordjsError,
	hyperlink,
} = require('discord.js');
const { replyOrEditReply } = require('../../utilities');
const { createMenuCommandHelper } = require('../../menuCommandUtilities');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'wiki' });

const menuHelper = createMenuCommandHelper({
	envVarName: 'WIKI_ITEMS_PATH',
	customId: 'wiki-selector',
	placeholder: 'Select a wiki topic',
	logger,
});

module.exports = {
	init: () => {
		menuHelper.loadMenuItems();
		menuHelper.watchForMenuChanges();
	},
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('wiki')
		.setDescription('Links to wiki topics')
		.addStringOption((option) =>
			option
				.setName('topic')
				.setDescription('The name of the wiki topic to send')
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
					content: `No wiki entry for ${topic} found`,
					ephemeral: true,
				});
				return;
			}

			const link = hyperlink(selectedItem.description, selectedItem.href);
			const preamble =
				selectedItem.preamble ??
				'Check out the following link for more information:';

			await replyOrEditReply(interaction, {
				content: 'Link sent!',
				components: [],
				ephemeral: true,
			});

			await interaction.channel.send({
				content: `${preamble} ${link}`,
			});
		}
		catch (error) {
			if (
				error instanceof DiscordjsError &&
				error.code === 'InteractionCollectorError'
			) {
				await replyOrEditReply(interaction, {
					content: 'No response received, canceling sending the wiki link',
					components: [],
					ephemeral: true,
				});
			}
			else {
				logger.error(`Unable to send wiki link: ${error}`, error);
				await replyOrEditReply(interaction, {
					content: `Unable to send wiki link: ${error}`,
					components: [],
					ephemeral: true,
				});
			}
		}
	},
};
