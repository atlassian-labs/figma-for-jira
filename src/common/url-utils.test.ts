import { appendToPathname } from './url-utils';

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
});
