import { generateFigmaOAuth2UserCredentials } from './testing';

import { Duration } from '../../common/duration';

describe('FigmaOAuth2UserCredentials', () => {
	describe('isExpired', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		});

		test('should return `false` token when not expired', () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now + Duration.ofMinutes(60).asMilliseconds + 1),
			});

			expect(credentials.isExpired()).toBe(false);
		});

		test('should return `true` token when expired', () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now + Duration.ofMinutes(60).asMilliseconds - 1),
			});

			expect(credentials.isExpired()).toBe(true);
		});
	});
});
