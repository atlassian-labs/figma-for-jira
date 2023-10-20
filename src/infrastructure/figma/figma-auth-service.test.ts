import { encodeSymmetric, SymmetricAlgorithm } from 'atlassian-jwt';
import { v4 as uuidv4 } from 'uuid';

import { figmaAuthService } from './figma-auth-service';
import { figmaClient } from './figma-client';
import {
	generateGetOAuth2TokenResponse,
	generateRefreshOAuth2TokenResponse,
} from './figma-client/testing';

import { Duration } from '../../common/duration';
import {
	NotFoundOperationError,
	UnauthorizedOperationError,
} from '../../common/errors';
import { getConfig } from '../../config';
import {
	generateConnectInstallation,
	generateConnectUserInfo,
	generateFigmaOAuth2UserCredentials,
} from '../../domain/entities/testing';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

const FIGMA_OAUTH_CODE = uuidv4();

describe('FigmaAuthService', () => {
	const NOW = Date.now();
	const NOW_IN_SECONDS = Math.floor(Date.now() / 1000);

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

		it('should throw UnauthorizedOperationError when no credentials', async () => {
			const connectUserInfo = generateConnectUserInfo();
			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockRejectedValue(new NotFoundOperationError('error'));

			await expect(() =>
				figmaAuthService.getCredentials(connectUserInfo),
			).rejects.toBeInstanceOf(UnauthorizedOperationError);
		});

		it('should throw UnauthorizedOperationError when refreshing expired credentials fails', async () => {
			const now = Date.now();
			jest.setSystemTime(now);
			const connectUserInfo = generateConnectUserInfo();
			const credentials = generateFigmaOAuth2UserCredentials({
				expiresAt: new Date(now - Duration.ofMinutes(30).asMilliseconds),
				atlassianUserId: connectUserInfo.atlassianUserId,
				connectInstallationId: connectUserInfo.connectInstallationId,
			});
			const error = new Error('error');

			jest
				.spyOn(figmaOAuth2UserCredentialsRepository, 'get')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'refreshOAuth2Token').mockRejectedValue(error);

			await expect(
				figmaAuthService.getCredentials(connectUserInfo),
			).rejects.toThrowError(UnauthorizedOperationError);
		});
	});

	describe('createOAuth2AuthorizationRequest', () => {
		it('should return an authorisation request', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();

			const result = figmaAuthService.createOAuth2AuthorizationRequest({
				atlassianUserId,
				connectInstallation,
				redirectEndpoint: `figma/oauth2/callback`,
			});

			const expectedUrl = new URL(
				'/oauth',
				getConfig().figma.oauth2.authorizationServerBaseUrl,
			);
			expectedUrl.search = new URLSearchParams({
				client_id: getConfig().figma.oauth2.clientId,
				redirect_uri: `${getConfig().app.baseUrl}/figma/oauth2/callback`,
				scope: getConfig().figma.oauth2.scope,
				state: encodeSymmetric(
					{
						iss: connectInstallation.clientKey,
						iat: NOW_IN_SECONDS,
						exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
						sub: atlassianUserId,
						aud: [getConfig().app.baseUrl],
					},
					getConfig().figma.oauth2.stateSecretKey,
					SymmetricAlgorithm.HS256,
				),
				response_type: 'code',
			}).toString();

			expect(result).toBe(expectedUrl.toString());
		});
	});

	describe('createOAuth2AuthorizationRequest', () => {
		it('should return decoded state when state is valid', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const state = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					aud: [getConfig().app.baseUrl],
				},
				getConfig().figma.oauth2.stateSecretKey,
				SymmetricAlgorithm.HS256,
			);

			const result =
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state);

			expect(result).toEqual({
				atlassianUserId,
				connectClientKey: connectInstallation.clientKey,
			});
		});

		it('should throw when state is not a JWT token', () => {
			const state = uuidv4();

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});

		it('should throw when token is signed with unexpected key', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const state = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					aud: [getConfig().app.baseUrl],
				},
				uuidv4(),
				SymmetricAlgorithm.HS256,
			);

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});

		it('should throw when `iss` claim is invalid', () => {
			jest.setSystemTime(NOW);
			const atlassianUserId = uuidv4();
			const state = encodeSymmetric(
				{
					iss: '',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					aud: [getConfig().app.baseUrl],
				},
				getConfig().figma.oauth2.stateSecretKey,
				SymmetricAlgorithm.HS256,
			);

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});

		it('should throw when `sub` claim is invalid', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const state = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: '',
					aud: [getConfig().app.baseUrl],
				},
				getConfig().figma.oauth2.stateSecretKey,
				SymmetricAlgorithm.HS256,
			);

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});

		it('should throw when `aud` claim does not contain app base URL', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const state = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					aud: [`https://${uuidv4()}.com`],
				},
				getConfig().figma.oauth2.stateSecretKey,
				SymmetricAlgorithm.HS256,
			);

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});

		it('should throw when token is expired', () => {
			jest.setSystemTime(NOW);
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const state = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS - Duration.ofMinutes(1).asSeconds,
					sub: atlassianUserId,
					aud: [getConfig().app.baseUrl],
				},
				getConfig().figma.oauth2.stateSecretKey,
				SymmetricAlgorithm.HS256,
			);

			expect(() =>
				figmaAuthService.verifyOAuth2AuthorizationResponseState(state),
			).toThrow();
		});
	});
});
