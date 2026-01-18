const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	DiscordjsError,
} = require('discord.js');
const { replyOrEditReply } = require('../../utilities');
const chokidar = require('chokidar');
const fs = require('fs');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'support' });

let selectMenu;
let menuItems;

function loadMenuItems() {
	logger.debug(`Loading menu items from ${process.env.SUPPORT_ITEMS_PATH}`);
	try {
		menuItems = JSON.parse(
			fs.readFileSync(process.env.SUPPORT_ITEMS_PATH, 'utf8'),
		);

		selectMenu = new StringSelectMenuBuilder()
			.setCustomId('support-selector')
			.setPlaceholder('Select a support topic');

		menuItems.forEach((item) => {
			selectMenu.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(item.label)
					.setDescription(item.description)
					.setValue(item.value),
			);
		});
	}
	catch (err) {
		logger.error(
			`Failed to load support menu items from ${process.env.SUPPORT_ITEMS_PATH}: ${err.message}`,
			err,
		);
	}
}

function watchForMenuChanges() {
	try {
		chokidar
			.watch(process.env.SUPPORT_ITEMS_PATH, {
				awaitWriteFinish: true,
			})
			.on('change', loadMenuItems);
		logger.debug(`Watching for changes in ${process.env.SUPPORT_ITEMS_PATH}`);
	}
	catch (e) {
		logger.error(
			`Unable to watch for changes to ${process.env.SUPPORT_ITEMS_PATH}: ${e}`,
		);
	}
}

async function promptForTopic(interaction) {
	const row = new ActionRowBuilder().addComponents(selectMenu);

	const menu = await interaction.reply({
		content: 'Select a topic',
		components: [row],
		ephemeral: true,
	});

	const collectorFilter = (i) => i.user.id === interaction.user.id;

	const confirmation = await menu.awaitMessageComponent({
		filter: collectorFilter,
		time: 60_000,
	});

	return confirmation.values[0];
}

module.exports = {
	init: () => {
		loadMenuItems();
		watchForMenuChanges();
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
			let topic;
			topic = interaction.options.getString('topic') ?? null;

			if (topic === null) {
				topic = await promptForTopic(interaction);
			}

			const selectedItem = menuItems.find((item) => item.value === topic);

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
