const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	DiscordjsError,
} = require('discord.js');
const { replyOrEditReply } = require('./utilities');
const chokidar = require('chokidar');
const fs = require('fs');

/**
 * Creates a command that sends content from a JSON file with dropdown menu support
 * @param {Object} config - Configuration object
 * @param {string} config.commandName - Name of the command (e.g., 'wiki', 'support')
 * @param {string} config.description - Description of the command
 * @param {string} config.envVarPath - Environment variable name for the JSON file path
 * @param {Function} config.formatContent - Function to format the content for sending
 * @param {Object} config.logger - Logger instance
 * @param {number} [config.permissions] - Optional permissions for the command
 * @returns {Object} Command module with init, cooldown, data, and execute
 */
function createJsonCommand(config) {
	const {
		commandName,
		description,
		envVarPath,
		formatContent,
		logger,
		permissions,
	} = config;

	let selectMenu;
	let menuItems;

	function loadMenuItems() {
		logger.debug(`Loading menu items from ${process.env[envVarPath]}`);
		try {
			menuItems = JSON.parse(
				fs.readFileSync(process.env[envVarPath], 'utf8'),
			);

			selectMenu = new StringSelectMenuBuilder()
				.setCustomId(`${commandName}-selector`)
				.setPlaceholder(`Select a ${commandName} topic`);

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
				`Failed to load menu items from ${process.env[envVarPath]}: ${err.message}`,
				err,
			);
		}
	}

	function watchForMenuChanges() {
		try {
			chokidar
				.watch(process.env[envVarPath], {
					awaitWriteFinish: true,
				})
				.on('change', loadMenuItems);
			logger.debug(`Watching for changes in ${process.env[envVarPath]}`);
		}
		catch (e) {
			logger.error(
				`Unable to watch for changes to ${process.env[envVarPath]}: ${e}`,
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

	const commandBuilder = new SlashCommandBuilder()
		.setName(commandName)
		.setDescription(description)
		.addStringOption((option) =>
			option
				.setName('topic')
				.setDescription(`The name of the ${commandName} topic to send`)
				.setRequired(false),
		);

	if (permissions) {
		commandBuilder.setDefaultMemberPermissions(permissions);
	}

	return {
		init: () => {
			loadMenuItems();
			watchForMenuChanges();
		},
		cooldown: 5,
		data: commandBuilder,
		async execute(interaction) {
			try {
				let topic = interaction.options.getString('topic') ?? null;

				if (topic === null) {
					topic = await promptForTopic(interaction);
				}

				const selectedItem = menuItems.find((item) => item.value === topic);

				if (selectedItem === undefined) {
					await replyOrEditReply(interaction, {
						content: `No ${commandName} entry for ${topic} found`,
						ephemeral: true,
					});
					return;
				}

				const content = formatContent(selectedItem);

				await replyOrEditReply(interaction, {
					content: `${commandName.charAt(0).toUpperCase() + commandName.slice(1)} sent!`,
					components: [],
					ephemeral: true,
				});

				await interaction.channel.send({
					content: content,
				});
			}
			catch (error) {
				if (
					error instanceof DiscordjsError &&
					error.code === 'InteractionCollectorError'
				) {
					await replyOrEditReply(interaction, {
						content: `No response received, canceling sending the ${commandName}`,
						components: [],
						ephemeral: true,
					});
				}
				else {
					logger.error(`Unable to send ${commandName}: ${error}`, error);
					await replyOrEditReply(interaction, {
						content: `Unable to send ${commandName}: ${error}`,
						components: [],
						ephemeral: true,
					});
				}
			}
		},
	};
}

module.exports = { createJsonCommand };
