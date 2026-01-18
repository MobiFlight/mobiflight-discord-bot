const { PermissionFlagsBits } = require('discord.js');
const { createJsonCommand } = require('../../commandFactory');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'support' });

module.exports = createJsonCommand({
	commandName: 'support',
	description: 'Support message templates',
	envVarPath: 'SUPPORT_MESSAGES_PATH',
	formatContent: (item) => {
		// Handle array content (multi-line strings)
		if (Array.isArray(item.content)) {
			return item.content.join('\n');
		}
		// Fallback to string content
		return item.content;
	},
	logger: logger,
	permissions: PermissionFlagsBits.ModerateMembers,
});
