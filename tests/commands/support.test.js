import { describe, it, expect } from 'vitest';

describe('support command', () => {
	describe('formatContent function', () => {
		it('should join array content with newlines', () => {
			const formatContent = (item) => {
				if (Array.isArray(item.content)) {
					return item.content.join('\n');
				}
				return item.content;
			};

			const item = {
				content: ['Line 1', 'Line 2', '', 'Line 4'],
			};

			const result = formatContent(item);
			expect(result).toBe('Line 1\nLine 2\n\nLine 4');
		});

		it('should return string content as-is', () => {
			const formatContent = (item) => {
				if (Array.isArray(item.content)) {
					return item.content.join('\n');
				}
				return item.content;
			};

			const item = {
				content: 'Simple string content',
			};

			const result = formatContent(item);
			expect(result).toBe('Simple string content');
		});

		it('should handle empty arrays', () => {
			const formatContent = (item) => {
				if (Array.isArray(item.content)) {
					return item.content.join('\n');
				}
				return item.content;
			};

			const item = {
				content: [],
			};

			const result = formatContent(item);
			expect(result).toBe('');
		});

		it('should handle undefined content', () => {
			const formatContent = (item) => {
				if (Array.isArray(item.content)) {
					return item.content.join('\n');
				}
				return item.content;
			};

			const item = {};

			const result = formatContent(item);
			expect(result).toBeUndefined();
		});
	});
});
