import { redactOptions } from './logger';

describe('redactOptions', () => {
	describe('censor', () => {
		it('should replace query parameters of a url with [REDACTED]', () => {
			expect(
				redactOptions.censor(
					'https://example.com?query=123&string=abc&foo=bar',
					['err', 'config', 'url'],
				),
			).toBe(
				'https://example.com?query=[REDACTED]&string=[REDACTED]&foo=[REDACTED]',
			);
		});

		it('should not redact anything for urls without query parameters', () => {
			expect(
				redactOptions.censor('https://example.com/path/to/resource', ['url']),
			).toBe('https://example.com/path/to/resource');
		});

		it('should return [REDACTED] for any other path', () => {
			expect(redactOptions.censor({ foo: 'bar' }, ['other', 'path'])).toBe(
				'[REDACTED]',
			);
		});
	});
});
