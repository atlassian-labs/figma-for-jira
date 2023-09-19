import { v4 as uuidv4 } from 'uuid';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
	RefreshFigmaCredentialsError,
} from './figma-auth-service';
import { figmaClient } from './figma-client';
import {
	generateGetOAuth2TokenResponse,
	generateRefreshOAuth2TokenResponse,
} from './figma-client/testing';

import { Duration } from '../../common/duration';
import { generateFigmaOAuth2UserCredentials } from '../../domain/entities/testing';
import {
	figmaOAuth2UserCredentialsRepository,
	RepositoryRecordNotFoundError,
} from '../repositories';

const FIGMA_OAUTH_CODE = uuidv4();
const ATLASSIAN_USER_ID = uuidv4();

describe('FigmaAuthService', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
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
				expiresAt: new Date(
					Date.now() + Duration.ofMinutes(10000).asMilliseconds,
				),
			});
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);

			const result = await figmaAuthService.getCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(credentials);
			expect(figmaOAuth2UserCredentialsRepository.get).toHaveBeenCalledWith(
				ATLASSIAN_USER_ID,
			);
		});

		it('should refresh, store and return credentials when it is expired', async () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now - Duration.ofMinutes(30).asMilliseconds),
			});
			const refreshOAuth2TokenResponse = generateRefreshOAuth2TokenResponse();
			const refreshedCredentials = generateFigmaOAuth2UserCredentials({
				id: credentials.id,
				atlassianUserId: credentials.atlassianUserId,
				accessToken: refreshOAuth2TokenResponse.access_token,
				refreshToken: credentials.refreshToken,
				expiresAt: new Date(now + refreshOAuth2TokenResponse.expires_in * 1000),
			});

			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'refreshOAuth2Token')
				.mockResolvedValue(refreshOAuth2TokenResponse);
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'upsert')
				.mockResolvedValue(refreshedCredentials);

			const result = await figmaAuthService.getCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(refreshedCredentials);
			expect(figmaOAuth2UserCredentialsRepository.upsert).toHaveBeenCalledWith({
				atlassianUserId: refreshedCredentials.atlassianUserId,
				accessToken: refreshedCredentials.accessToken,
				refreshToken: refreshedCredentials.refreshToken,
				expiresAt: refreshedCredentials.expiresAt,
			});
		});

		it('should throw when no credentials', async () => {
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockRejectedValue(new RepositoryRecordNotFoundError('error'));

			await expect(() =>
				figmaAuthService.getCredentials(ATLASSIAN_USER_ID),
			).rejects.toBeInstanceOf(NoFigmaCredentialsError);
		});

		it('should throw when refreshing expired credentials fails', async () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now - Duration.ofMinutes(30).asMilliseconds),
			});

			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'refreshOAuth2Token')
				.mockRejectedValue(new Error('error'));

			await expect(
				figmaAuthService.getCredentials(ATLASSIAN_USER_ID),
			).rejects.toBeInstanceOf(RefreshFigmaCredentialsError);
		});
	});
});
