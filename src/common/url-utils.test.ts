import { appendToPathname, tryParseUrl } from './url-utils';

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

	describe('tryParseUrl', () => {
		it.each(['https://test.com/', 'https://test.com/test?v=1'])(
			'should return parsed URL if input is valid URL',
			(url) => {
				const result = tryParseUrl(url);

				expect(result?.toString()).toBe(url);
			},
		);

		it.each(['invalid-url', ''])(
			'should return undefined if input is invalid URL',
			(url) => {
				const result = tryParseUrl(url);

				expect(result?.toString()).toBeUndefined();
			},
		);
	});
});
