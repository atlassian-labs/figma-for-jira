import { figmaClient } from './figma-client';

import {
	NotFoundOperationError,
	UnauthorizedOperationError,
} from '../../common/errors';
import { getConfig } from '../../config';
import type {
	ConnectUserInfo,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

export class FigmaAuthService {
	/**
	 * Exchanges the given code on OAuth 2.0 token and stores the credentials for the future usage.
	 */
	createCredentials = async (
		code: string,
		user: ConnectUserInfo,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.getOAuth2Token(code);

		return await figmaOAuth2UserCredentialsRepository.upsert({
			atlassianUserId: user.atlassianUserId,
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresAt: this.createExpiryDate(response.expires_in),
			connectInstallationId: user.connectInstallationId,
		});
	};

	/**
	 * Returns OAuth 2.0 credentials for the given user if he/she completed OAuth 2.0 flow; otherwise -- `null`.
	 *
	 * The method refreshes access token when required, so the caller does not need to handle token expiration.
	 */
	getCredentials = async (
		user: ConnectUserInfo,
	): Promise<FigmaOAuth2UserCredentials> => {
		try {
			let credentials = await figmaOAuth2UserCredentialsRepository.get(
				user.atlassianUserId,
				user.connectInstallationId,
			);

			if (credentials.isExpired()) {
				credentials = await this.refreshCredentials(credentials);
			}

			return credentials;
		} catch (e: unknown) {
			if (e instanceof NotFoundOperationError) {
				throw new UnauthorizedOperationError(
					'Cannot get Figma credentials.',
					e,
				);
			}

			throw e;
		}
	};

	/**
	 * Returns an OAuth 2.0 authorization endpoint for the given user.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	buildAuthorizationEndpoint = (
		user: ConnectUserInfo,
		redirectUri: string,
	): string => {
		const authorizationEndpoint = new URL(
			'/oauth',
			getConfig().figma.oauthApiBaseUrl,
		);

		authorizationEndpoint.search = new URLSearchParams({
			client_id: getConfig().figma.clientId,
			redirect_uri: redirectUri,
			scope: getConfig().figma.scope,
			state: `${user.connectInstallationId}/${user.atlassianUserId}`, // TODO: MDTZ-1014: Use an anti-forgery state token to prevent Cross-Site Request Forgery (CSRF) attacks.
			response_type: 'code',
		}).toString();

		return authorizationEndpoint.toString();
	};

	/**
	 * Returns {@link ConnectUserInfo} extracted from the given `state`.
	 *
	 * @param state A value of the `state` query parameter bypassed by the authorization server through OAuth 2.0 flow.
	 * 	 This is the same value, which was created by {@link buildAuthorizationEndpoint}.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	getUserFromAuthorizationCallbackState = (state: string): ConnectUserInfo => {
		const [connectInstallationId, atlassianUserId] = state.split('/');

		if (!connectInstallationId || !atlassianUserId)
			throw new Error('Unexpected state.');

		return { atlassianUserId, connectInstallationId };
	};

	private refreshCredentials = async (
		credentials: FigmaOAuth2UserCredentials,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.refreshOAuth2Token(
			credentials.refreshToken,
		);

		return figmaOAuth2UserCredentialsRepository.upsert({
			atlassianUserId: credentials.atlassianUserId,
			accessToken: response.access_token,
			refreshToken: credentials.refreshToken,
			expiresAt: this.createExpiryDate(response.expires_in),
			connectInstallationId: credentials.connectInstallationId,
		});
	};

	private createExpiryDate(expiresInSeconds: number): Date {
		return new Date(Date.now() + expiresInSeconds * 1000);
	}
}

export const figmaAuthService = new FigmaAuthService();
