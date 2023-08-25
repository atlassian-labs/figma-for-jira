import { Duration } from './duration';

describe('Duration', () => {
	describe('ofMinutes', () => {
		it('should create duration from minutes', () => {
			const result = Duration.ofMinutes(5);

			expect(result.toMillis()).toBe(5 * 60 * 1000);
		});
	});

	describe('toMillis', () => {
		it('should return number of milliseconds', () => {
			const result = Duration.ofMinutes(10);

			expect(result.toMillis()).toBe(10 * 60 * 1000);
		});
	});
});
