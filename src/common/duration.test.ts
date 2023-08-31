import { Duration } from './duration';

describe('Duration', () => {
	describe('asMilliseconds', () => {
		it('should return number of milliseconds', () => {
			const result = Duration.ofMinutes(10);

			expect(result.asMilliseconds).toBe(10 * 60 * 1000);
		});
	});

	describe('asSeconds', () => {
		it('should return number of seconds', () => {
			const result = Duration.ofMinutes(10);

			expect(result.asSeconds).toBe(10 * 60);
		});
	});

	describe('ofSeconds', () => {
		it('should create duration from seconds', () => {
			const result = Duration.ofSeconds(5);

			expect(result.asMilliseconds).toBe(5 * 1000);
		});
	});

	describe('ofMinutes', () => {
		it('should create duration from minutes', () => {
			const result = Duration.ofMinutes(5);

			expect(result.asMilliseconds).toBe(5 * 60 * 1000);
		});
	});
});
