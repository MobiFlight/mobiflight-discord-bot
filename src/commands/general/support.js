const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { replyOrEditReply } = require('../../utilities');
const chokidar = require('chokidar');
const fs = require('fs');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'support' });

let supportMessages;

function loadSupportMessages() {
	logger.debug(`Loading support messages from ${process.env.SUPPORT_MESSAGES_PATH}`);
	try {
		supportMessages = JSON.parse(
			fs.readFileSync(process.env.SUPPORT_MESSAGES_PATH, 'utf8'),
		);
	}
	catch (err) {
		logger.error(
			`Failed to load support messages from ${process.env.SUPPORT_MESSAGES_PATH}: ${err.message}`,
			err,
		);
	}
}

function watchForMessageChanges() {
	try {
		chokidar
			.watch(process.env.SUPPORT_MESSAGES_PATH, {
				awaitWriteFinish: true,
			})
			.on('change', loadSupportMessages);
		logger.debug(`Watching for changes in ${process.env.SUPPORT_MESSAGES_PATH}`);
	}
	catch (e) {
		logger.error(
			`Unable to watch for changes to ${process.env.SUPPORT_MESSAGES_PATH}: ${e}`,
		);
	}
}

module.exports = {
	init: () => {
		loadSupportMessages();
		watchForMessageChanges();
	},
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
		else {
			logger.warn(`Unknown subcommand for /support: ${subcommand}`);
			await replyOrEditReply(interaction, {
				content: `Unknown subcommand: \`${subcommand}\`. Please use \`/support more-infos\`.`,
				ephemeral: true,
			});
		}
	},
};

async function executeMoreInfosCommand(interaction) {
	try {
		const messageData = supportMessages.find((item) => item.key === 'more-infos');

		if (messageData === undefined) {
			await replyOrEditReply(interaction, {
				content: 'Support message not found',
				ephemeral: true,
			});
			return;
		}

		await replyOrEditReply(interaction, {
			content: 'Details prompt sent!',
			ephemeral: true,
		});

		await interaction.channel.send({
			content: messageData.message,
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
