import { isString } from './stringUtils';

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
});
