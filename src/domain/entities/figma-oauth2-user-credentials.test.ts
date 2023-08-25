import { v4 as uuidv4 } from 'uuid';

import { FigmaOAuth2UserCredentials } from './figma-oauth2-user-credentials';

import { Duration } from '../../common/duration';

// TODO: Move this code to the shared location.
const generateFigmaOAuth2UserCredentials = ({
	id = Date.now(),
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(),
} = {}) =>
	new FigmaOAuth2UserCredentials(
		id,
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	);

describe('FigmaOAuth2UserCredentials', () => {
	describe('isExpired', () => {
		beforeAll(() => {
			jest.useFakeTimers();
		});

		afterAll(() => {
			jest.useRealTimers();
		});

		test('should return `false` token when not expired', () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now + Duration.ofMinutes(60).toMillis() + 1),
			});

			expect(credentials.isExpired()).toBe(false);
		});

		test('should return `true` token when expired', () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now + Duration.ofMinutes(60).toMillis() - 1),
			});

			expect(credentials.isExpired()).toBe(true);
		});
	});
});
