import { v4 as uuidv4 } from 'uuid';

import { figmaAuthService } from './figma-auth-service';
import { figmaClient, GetOAuth2TokenResponse } from './figma-client';

import { Duration } from '../../common/duration';
import { FigmaOAuth2UserCredentials } from '../../domain/entities';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

const FIGMA_OAUTH_CODE = uuidv4();
const ATLASSIAN_USER_ID = uuidv4();

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

const generateGetOAuth2TokenResponse = ({
	access_token = uuidv4(),
	refresh_token = uuidv4(),
	expires_in = 90 * 60 * 60,
} = {}): GetOAuth2TokenResponse => ({
	access_token,
	refresh_token,
	expires_in,
});

describe('FigmaAuthService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();
	});

	describe('createCredentials', () => {
		it('should fetch and store credentials', async () => {
			const getOAuth2TokenResponse = generateGetOAuth2TokenResponse();
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaClient, 'getOAuth2Token')
				.mockResolvedValue(getOAuth2TokenResponse);
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'upsert')
				.mockResolvedValue(credentials);

			const result = await figmaAuthService.createCredentials(
				FIGMA_OAUTH_CODE,
				ATLASSIAN_USER_ID,
			);

			expect(result).toBe(credentials);
			expect(figmaClient.getOAuth2Token).toHaveBeenCalledWith(FIGMA_OAUTH_CODE);
			expect(figmaOAuth2UserCredentialsRepository.upsert).toHaveBeenCalledWith({
				atlassianUserId: ATLASSIAN_USER_ID,
				accessToken: getOAuth2TokenResponse.access_token,
				refreshToken: getOAuth2TokenResponse.refresh_token,
				expiresAt: new Date(
					Date.now() + getOAuth2TokenResponse.expires_in * 1000,
				),
			});
		});
	});

	describe('getCredentials', () => {
		it('should return credentials when it is not expired', async () => {
			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(Date.now() + Duration.ofMinutes(10000).toMillis()),
			});
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'find')
				.mockResolvedValue(credentials);

			const result = await figmaAuthService.getCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(credentials);
			expect(figmaOAuth2UserCredentialsRepository.find).toHaveBeenCalledWith(
				ATLASSIAN_USER_ID,
			);
		});

		it('should return refresh and store credentials when it is expired', async () => {
			// TODO: Update the test to mock and assert token refresh.
		});

		it('should throw when no credentials', async () => {
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'find')
				.mockResolvedValue(null);

			await expect(() =>
				figmaAuthService.getCredentials(ATLASSIAN_USER_ID),
			).rejects.toThrowError();
		});
	});
});
