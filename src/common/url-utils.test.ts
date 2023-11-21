import { appendToPathname, encodeURIComponentAndDash } from './url-utils';

describe('urlUtils', () => {
	describe('removeTrailingSlashFromPathname', () => {
		it.each([
			[new URL('https://test.com'), '1', new URL('https://test.com/1')],
			[new URL('https://test.com/'), '1', new URL('https://test.com/1')],
			[new URL('https://test.com/'), '/1', new URL('https://test.com/1')],
			[new URL('https://test.com/v'), '1', new URL('https://test.com/v/1')],
			[new URL('https://test.com/v'), '/1', new URL('https://test.com/v/1')],
			[new URL('https://test.com/v/'), '/1', new URL('https://test.com/v/1')],
		])(
			'should return a URL with appended path segment',
			(url, path, expected) => {
				const result = appendToPathname(url, path).toString();

				expect(result).toBe(expected.toString());
			},
		);
	});

	describe('encodeURIComponentAndDash', () => {
		it('should encode URI component as encodeURIComponent', () => {
			const result = encodeURIComponentAndDash('test/?@:;');

			expect(result).toBe(encodeURIComponent('test/?@:;'));
		});

		it('should encode dash character', () => {
			const result = encodeURIComponentAndDash('test-1');

			expect(result).toBe('test%2D1');
		});
	});
});
