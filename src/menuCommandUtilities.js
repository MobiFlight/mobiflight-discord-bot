const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const chokidar = require('chokidar');
const fs = require('fs');

/**
 * Creates a menu command helper with shared functionality for loading menu items,
 * watching for file changes, and prompting users for topic selection.
 *
 * @param {Object} config Configuration object
 * @param {string} config.envVarName - Name of the environment variable containing the menu items path
 * @param {string} config.customId - Custom ID for the select menu
 * @param {string} config.placeholder - Placeholder text for the select menu
 * @param {Object} config.logger - Logger instance for this command
 * @returns {Object} Helper object with loadMenuItems, watchForMenuChanges, promptForTopic, and getMenuItems functions
 */
function createMenuCommandHelper(config) {
	const { envVarName, customId, placeholder, logger } = config;
	let selectMenu;
	let menuItems;

	function loadMenuItems() {
		const filePath = process.env[envVarName];
		if (!filePath) {
			logger.error(`Environment variable ${envVarName} is not set`);
			return;
		}
		logger.debug(`Loading menu items from ${filePath}`);
		try {
			menuItems = JSON.parse(
				fs.readFileSync(filePath, 'utf8'),
			);

			selectMenu = new StringSelectMenuBuilder()
				.setCustomId(customId)
				.setPlaceholder(placeholder);

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
				`Failed to load menu items from ${filePath}: ${err.message}`,
				err,
			);
		}
	}

	function watchForMenuChanges() {
		const filePath = process.env[envVarName];
		if (!filePath) {
			logger.error(`Environment variable ${envVarName} is not set, cannot watch for changes`);
			return;
		}
		try {
			chokidar
				.watch(filePath, {
					awaitWriteFinish: true,
				})
				.on('change', loadMenuItems);
			logger.debug(`Watching for changes in ${filePath}`);
		}
		catch (e) {
			logger.error(
				`Unable to watch for changes to ${filePath}: ${e}`,
			);
		}
	}

	async function promptForTopic(interaction) {
		if (!selectMenu) {
			throw new Error('Menu not initialized. Ensure loadMenuItems() has been called successfully.');
		}
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

	function getMenuItems() {
		return menuItems;
	}

	return {
		loadMenuItems,
		watchForMenuChanges,
		promptForTopic,
		getMenuItems,
	};
}

module.exports = {
	createMenuCommandHelper,
};
