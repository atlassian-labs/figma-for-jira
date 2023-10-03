import { ensureString, isString } from './stringUtils';

describe('stringUtils', () => {
	describe('isString', () => {
		it('should return `true` when string is given', () => {
			expect(isString('test')).toBe(true);
		});

		it.each([undefined, null, true, 1, {}])(
			'should return `false` when non-string (%s) is given',
			(value) => {
				expect(isString(value)).toBe(false);
			},
		);
	});

	describe('ensureString', () => {
		it('should throw when non-string is given', () => {
			expect(() => ensureString(1)).toThrow(
				new TypeError(
					'The provided value is not of the correct type. Expected string, but received: number',
				),
			);
		});
	});
});
