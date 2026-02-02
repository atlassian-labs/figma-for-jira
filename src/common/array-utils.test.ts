import { uniqueBy } from './array-utils';

describe('arrayUtils', () => {
	describe('uniqueBy', () => {
		it.each([
			[[], []],
			[
				[1, 2, 2, 3],
				[1, 2, 3],
			],
			[
				['b', 'b', 'a', 'c', 'c'],
				['b', 'a', 'c'],
			],
			[
				[{ value: 1 }, { value: 1 }, { value: 2 }],
				[{ value: 1 }, { value: 2 }],
			],
		])(
			'should return array of unique items',
			(input: unknown[], expected: unknown[]) => {
				const result = uniqueBy(
					input,
					(x, y) => JSON.stringify(x) === JSON.stringify(y),
				);

				expect(result).toEqual(expected);
			},
		);
	});
});
