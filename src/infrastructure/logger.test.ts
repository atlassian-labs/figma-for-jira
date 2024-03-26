import { redactOptions } from './logger';

describe('redactOptions', () => {
	describe('censor', () => {
		it('should replace query parameters of a url with [REDACTED]', () => {
			expect(
				redactOptions.censor(
					'https://example.com?query=123&string=abc&foo=bar',
					['err', 'config', 'url'],
				),
			).toBe('https://example.com?[REDACTED]');
		});
	});
});
