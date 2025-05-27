import { tryParseUrl } from './url-utils';

describe('urlUtils', () => {
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
