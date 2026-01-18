const { hyperlink } = require('discord.js');
const { createJsonCommand } = require('../../commandFactory');

const mainLogger = require('../../logger');
const logger = mainLogger.child({ service: 'wiki' });

module.exports = createJsonCommand({
	commandName: 'wiki',
	description: 'Links to wiki topics',
	envVarPath: 'WIKI_ITEMS_PATH',
	formatContent: (item) => {
		const link = hyperlink(item.description, item.href);
		const preamble = item.preamble ?? 'Check out the following link for more information:';
		return `${preamble} ${link}`;
	},
	logger: logger,
});
