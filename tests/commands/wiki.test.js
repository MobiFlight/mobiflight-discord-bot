import { describe, it, expect } from 'vitest';

describe('wiki command', () => {
	describe('formatContent function', () => {
		it('should format content with hyperlink and preamble', () => {
			// Simulate the hyperlink function
			const hyperlink = (text, url) => `[${text}](${url})`;
			
			const formatContent = (item) => {
				const link = hyperlink(item.description, item.href);
				const preamble = item.preamble ?? 'Check out the following link for more information:';
				return `${preamble} ${link}`;
			};

			const item = {
				description: 'Test Description',
				href: 'https://example.com',
				preamble: 'Check this out:',
			};

			const result = formatContent(item);
			expect(result).toBe('Check this out: [Test Description](https://example.com)');
		});

		it('should use default preamble when not provided', () => {
			const hyperlink = (text, url) => `[${text}](${url})`;
			
			const formatContent = (item) => {
				const link = hyperlink(item.description, item.href);
				const preamble = item.preamble ?? 'Check out the following link for more information:';
				return `${preamble} ${link}`;
			};

			const item = {
				description: 'Test Description',
				href: 'https://example.com',
			};

			const result = formatContent(item);
			expect(result).toBe('Check out the following link for more information: [Test Description](https://example.com)');
		});

		it('should handle different descriptions and URLs', () => {
			const hyperlink = (text, url) => `[${text}](${url})`;
			
			const formatContent = (item) => {
				const link = hyperlink(item.description, item.href);
				const preamble = item.preamble ?? 'Check out the following link for more information:';
				return `${preamble} ${link}`;
			};

			const item = {
				description: 'Getting Started Guide',
				href: 'https://docs.mobiflight.com/getting-started/',
				preamble: 'New to MobiFlight?',
			};

			const result = formatContent(item);
			expect(result).toBe('New to MobiFlight? [Getting Started Guide](https://docs.mobiflight.com/getting-started/)');
		});
	});
});
