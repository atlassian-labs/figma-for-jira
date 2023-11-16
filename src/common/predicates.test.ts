import { isNotNullOrUndefined } from './predicates';
import { isString } from './string-utils';

describe('predicates', () => {
	describe('isNotNullOrUndefined', () => {
		it('should return `true` when value is not `null` or `undefined`', () => {
			expect(isNotNullOrUndefined('test')).toBe(true);
		});

		it.each([undefined, null])(
			'should return `false` when value is `%s`',
			(value) => {
				expect(isString(value)).toBe(false);
			},
		);
	});
});
