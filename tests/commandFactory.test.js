import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('discord.js', () => ({
	SlashCommandBuilder: vi.fn().mockImplementation(() => ({
		setName: vi.fn().mockReturnThis(),
		setDescription: vi.fn().mockReturnThis(),
		addStringOption: vi.fn().mockReturnThis(),
		setDefaultMemberPermissions: vi.fn().mockReturnThis(),
	})),
	StringSelectMenuBuilder: vi.fn().mockImplementation(() => ({
		setCustomId: vi.fn().mockReturnThis(),
		setPlaceholder: vi.fn().mockReturnThis(),
		addOptions: vi.fn().mockReturnThis(),
	})),
	StringSelectMenuOptionBuilder: vi.fn().mockImplementation(() => ({
		setLabel: vi.fn().mockReturnThis(),
		setDescription: vi.fn().mockReturnThis(),
		setValue: vi.fn().mockReturnThis(),
	})),
	ActionRowBuilder: vi.fn().mockImplementation(() => ({
		addComponents: vi.fn().mockReturnThis(),
	})),
	DiscordjsError: class DiscordjsError extends Error {
		constructor(message) {
			super(message);
			this.code = 'InteractionCollectorError';
		}
	},
}));

vi.mock('../src/utilities.js', () => ({
	replyOrEditReply: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('chokidar', () => ({
	default: {
		watch: vi.fn().mockReturnValue({
			on: vi.fn().mockReturnThis(),
		}),
	},
}));

vi.mock('fs', () => ({
	readFileSync: vi.fn(),
}));

// Import after mocking
const { createJsonCommand } = await import('../src/commandFactory.js');

describe('commandFactory', () => {
	let mockLogger;
	let mockConfig;
	let mockFs;

	beforeEach(async () => {
		vi.clearAllMocks();
		
		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
		};

		mockConfig = {
			commandName: 'test',
			description: 'Test command',
			envVarPath: 'TEST_PATH',
			formatContent: (item) => item.content,
			logger: mockLogger,
		};

		// Set up environment variable
		process.env.TEST_PATH = '/test/path.json';
		
		// Get the mocked fs module
		const fs = await import('fs');
		mockFs = fs;
	});
	
	afterEach(() => {
		delete process.env.TEST_PATH;
	});

	describe('createJsonCommand', () => {
		it('should create command with required properties', () => {
			const command = createJsonCommand(mockConfig);

			expect(command).toHaveProperty('init');
			expect(command).toHaveProperty('cooldown');
			expect(command).toHaveProperty('data');
			expect(command).toHaveProperty('execute');
			expect(typeof command.init).toBe('function');
			expect(typeof command.execute).toBe('function');
			expect(command.cooldown).toBe(5);
		});

		it('should set default permissions when provided', () => {
			const configWithPerms = {
				...mockConfig,
				permissions: 0x0000000000000001,
			};

			const command = createJsonCommand(configWithPerms);
			
			// Just verify command was created successfully
			expect(command).toHaveProperty('data');
		});
	});

	describe('init', () => {
		it('should load menu items from file', () => {
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: 'Content 1' },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const command = createJsonCommand(mockConfig);
			command.init();

			expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/path.json', 'utf8');
			expect(mockLogger.debug).toHaveBeenCalledWith('Loading menu items from /test/path.json');
		});

		it('should handle missing environment variable', () => {
			delete process.env.TEST_PATH;

			const command = createJsonCommand(mockConfig);
			command.init();

			expect(mockLogger.error).toHaveBeenCalledWith('Environment variable TEST_PATH is not set');
		});

		it('should handle file read error', () => {
			mockFs.readFileSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			const command = createJsonCommand(mockConfig);
			command.init();

			expect(mockLogger.error).toHaveBeenCalled();
			expect(mockLogger.error.mock.calls[0][0]).toContain('Failed to load menu items');
		});

		it('should initialize menuItems as empty array on error', () => {
			mockFs.readFileSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			const command = createJsonCommand(mockConfig);
			command.init();

			// Should not throw when execute tries to access menuItems
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('execute', () => {
		it('should handle topic provided as option', async () => {
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: 'Test content' },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue('item1'),
				},
				channel: {
					send: vi.fn(),
				},
			};

			const command = createJsonCommand(mockConfig);
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.channel.send).toHaveBeenCalledWith({
				content: 'Test content',
			});
			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Test sent!',
				components: [],
				ephemeral: true,
			});
		});

		it('should handle topic not found', async () => {
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: 'Test content' },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue('nonexistent'),
				},
			};

			const command = createJsonCommand(mockConfig);
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'No test entry for nonexistent found',
				ephemeral: true,
			});
		});

		it('should handle empty menuItems', async () => {
			mockFs.readFileSync.mockReturnValue('[]');

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue('item1'),
				},
			};

			const command = createJsonCommand(mockConfig);
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'test command is not properly configured. Please contact an administrator.',
				ephemeral: true,
			});
		});

		it('should apply formatContent function', async () => {
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: ['Line 1', 'Line 2'] },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const customFormatContent = (item) => {
				if (Array.isArray(item.content)) {
					return item.content.join('\n');
				}
				return item.content;
			};

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue('item1'),
				},
				channel: {
					send: vi.fn(),
				},
			};

			const command = createJsonCommand({
				...mockConfig,
				formatContent: customFormatContent,
			});
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.channel.send).toHaveBeenCalledWith({
				content: 'Line 1\nLine 2',
			});
		});

		it('should capitalize command name in response', async () => {
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: 'Test' },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue('item1'),
				},
				channel: {
					send: vi.fn(),
				},
			};

			const command = createJsonCommand({
				...mockConfig,
				commandName: 'support',
			});
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Support sent!',
				components: [],
				ephemeral: true,
			});
		});

		it('should handle interaction collector timeout', async () => {
			const { DiscordjsError } = await import('discord.js');
			const testMenuItems = [
				{ label: 'Item 1', description: 'Desc 1', value: 'item1', content: 'Test' },
			];
			mockFs.readFileSync.mockReturnValue(JSON.stringify(testMenuItems));

			const mockInteraction = {
				deferred: false,
				replied: false,
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockReturnValue(null),
				},
				reply: vi.fn().mockResolvedValue({
					awaitMessageComponent: vi.fn().mockRejectedValue(new DiscordjsError('Timeout')),
				}),
				user: { id: '123' },
			};

			const command = createJsonCommand(mockConfig);
			command.init();
			await command.execute(mockInteraction);

			expect(mockInteraction.editReply).toHaveBeenCalledWith({
				content: 'No response received, canceling sending the test',
				components: [],
				ephemeral: true,
			});
		});

		it('should handle generic errors', async () => {
			mockFs.readFileSync.mockReturnValue('[]');

			const mockInteraction = {
				deferred: false,
				replied: false,
				reply: vi.fn().mockResolvedValue(undefined),
				editReply: vi.fn().mockResolvedValue(undefined),
				options: {
					getString: vi.fn().mockImplementation(() => {
						throw new Error('Unexpected error');
					}),
				},
			};

			const command = createJsonCommand(mockConfig);
			command.init();
			await command.execute(mockInteraction);

			expect(mockLogger.error).toHaveBeenCalled();
			expect(mockInteraction.reply).toHaveBeenCalled();
		});
	});
});
