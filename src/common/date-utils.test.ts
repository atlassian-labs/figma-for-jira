import { truncateToMillis } from './date-utils';

describe('dateUtils', () => {
	describe('truncateIsoToMillis', () => {
		it.each([
			['2023-11-05T23:08:49Z', '2023-11-05T23:08:49.000Z'],
			['2023-11-05T23:08:49.001Z', '2023-11-05T23:08:49.000Z'],
			['2023-11-05T23:08:49.500Z', '2023-11-05T23:08:49.000Z'],
			['2023-11-05T23:08:49.999Z', '2023-11-05T23:08:49.000Z'],
		])('should return date truncated to milliseconds', (input, expected) => {
			const result = truncateToMillis(new Date(input));

			expect(result.toISOString()).toBe(expected);
		});
	});
});
