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
import {
	generateConnectUserInfo,
	generateFigmaOAuth2UserCredentials,
} from '../../domain/entities/testing';
import {
	figmaOAuth2UserCredentialsRepository,
	RepositoryRecordNotFoundError,
} from '../repositories';

const FIGMA_OAUTH_CODE = uuidv4();

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
			const connectUserInfo = generateConnectUserInfo();
			const getOAuth2TokenResponse = generateGetOAuth2TokenResponse();
			const credentials = generateFigmaOAuth2UserCredentials({
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});
			jest
				.spyOn(figmaClient, 'getOAuth2Token')
				.mockResolvedValue(getOAuth2TokenResponse);
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'upsert')
				.mockResolvedValue(credentials);

			const result = await figmaAuthService.createCredentials(
				FIGMA_OAUTH_CODE,
				connectUserInfo,
			);

			expect(result).toBe(credentials);
			expect(figmaClient.getOAuth2Token).toHaveBeenCalledWith(FIGMA_OAUTH_CODE);
			expect(figmaOAuth2UserCredentialsRepository.upsert).toHaveBeenCalledWith({
				accessToken: getOAuth2TokenResponse.access_token,
				refreshToken: getOAuth2TokenResponse.refresh_token,
				expiresAt: new Date(
					Date.now() + getOAuth2TokenResponse.expires_in * 1000,
				),
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});
		});
	});

	describe('getCredentials', () => {
		it('should return credentials when it is not expired', async () => {
			const connectUserInfo = generateConnectUserInfo();
			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(
					Date.now() + Duration.ofMinutes(10000).asMilliseconds,
				),
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);

			const result = await figmaAuthService.getCredentials(connectUserInfo);

			expect(result).toBe(credentials);
			expect(figmaOAuth2UserCredentialsRepository.get).toHaveBeenCalledWith(
				connectUserInfo.atlassianUserId,
				connectUserInfo.connectInstallationId,
			);
		});

		it('should refresh, store and return credentials when it is expired', async () => {
			const now = Date.now();
			jest.setSystemTime(now);

			const connectUserInfo = generateConnectUserInfo();
			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now - Duration.ofMinutes(30).asMilliseconds),
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});
			const refreshOAuth2TokenResponse = generateRefreshOAuth2TokenResponse();
			const refreshedCredentials = generateFigmaOAuth2UserCredentials({
				id: credentials.id,
				accessToken: refreshOAuth2TokenResponse.access_token,
				refreshToken: credentials.refreshToken,
				expiresAt: new Date(now + refreshOAuth2TokenResponse.expires_in * 1000),
				atlassianUserId: credentials.atlassianUserId,
				connectInstallationId: credentials.connectInstallationId,
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

			const result = await figmaAuthService.getCredentials(connectUserInfo);

			expect(result).toBe(refreshedCredentials);
			expect(figmaOAuth2UserCredentialsRepository.upsert).toHaveBeenCalledWith({
				accessToken: refreshedCredentials.accessToken,
				refreshToken: refreshedCredentials.refreshToken,
				expiresAt: refreshedCredentials.expiresAt,
				atlassianUserId: refreshedCredentials.atlassianUserId,
				connectInstallationId: refreshedCredentials.connectInstallationId,
			});
		});

		it('should throw when no credentials', async () => {
			const connectUserInfo = generateConnectUserInfo();
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockRejectedValue(new RepositoryRecordNotFoundError('error'));

			await expect(() =>
				figmaAuthService.getCredentials(connectUserInfo),
			).rejects.toBeInstanceOf(NoFigmaCredentialsError);
		});

		it('should throw when refreshing expired credentials fails', async () => {
			const now = Date.now();
			jest.setSystemTime(now);
			const connectUserInfo = generateConnectUserInfo();
			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now - Duration.ofMinutes(30).asMilliseconds),
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});

			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaClient, 'refreshOAuth2Token')
				.mockRejectedValue(new Error('error'));

			await expect(
				figmaAuthService.getCredentials(connectUserInfo),
			).rejects.toBeInstanceOf(RefreshFigmaCredentialsError);
		});
	});
});
