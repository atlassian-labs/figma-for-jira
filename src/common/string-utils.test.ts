import { ensureString, isString, truncate } from './string-utils';
import utf16Str from './testing/utf16-str';

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
		it('does nothing when the string is less than the max length', () => {
			const string = 'hello there yay!';
			const result = truncate(string, 100);
			expect(result).toBe(string);
		});

		it('truncates strings greater than the max length', () => {
			const string = 'hello there yay!';
			const result = truncate(string, 10);
			expect(result).toBe('hello the…');
		});

		it('accounts for utf16 characters', () => {
			const result = truncate(utf16Str as string, 10);
			expect(result).toBe('你好你…');
		});
	});
});
