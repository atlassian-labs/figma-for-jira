import { ensureString, isString, truncate } from './string-utils';

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

	describe('truncate', () => {
		it('should do nothing if string is empty', () => {
			const result = truncate('', 100);

			expect(result).toBe('');
		});

		it('should do nothing when the string is less than the max length', () => {
			const string = 'hello there yay!';

			const result = truncate('hello there yay!', 100);

			expect(result).toBe(string);
		});

		it('should truncate strings greater than the given length', () => {
			const result = truncate('hello there yay!', 10);

			expect(result).toBe('hello the…');
		});

		it.each([
			{ input: '🐱🐱🐱', maxLength: 1, expected: '…' },
			{ input: '🐱🐱🐱', maxLength: 2, expected: '…' },
			{ input: '🐱🐱🐱', maxLength: 3, expected: '🐱…' },
		])(
			'should return well-formed string with no lone surrogates (%p)',
			({ input, maxLength, expected }) => {
				const result = truncate(input, maxLength);

				expect(result).toBe(expected);
			},
		);
	});
});
