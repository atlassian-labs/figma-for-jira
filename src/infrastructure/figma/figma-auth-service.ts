import { figmaClient } from './figma-client';

import { getConfig } from '../../config';
import type { FigmaOAuth2UserCredentials } from '../../domain/entities';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

export class FigmaAuthService {
	/**
	 * Exchanges the given code on OAuth 2.0 token and stores the credentials for the future usage.
	 */
	createCredentials = async (
		code: string,
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.getOAuth2Token(code);

		return await figmaOAuth2UserCredentialsRepository.upsert({
			atlassianUserId,
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresAt: this.createExpiryDate(response.expires_in),
		});
	};

	/**
	 * Returns OAuth 2.0 credentials for the given user if he/she completed OAuth 2.0 flow; otherwise -- `null`.
	 *
	 * The method refreshes access token when required, so the caller does not need to handle token expiration.
	 */
	getCredentials = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		let credentials: FigmaOAuth2UserCredentials;
		try {
			credentials =
				await figmaOAuth2UserCredentialsRepository.get(atlassianUserId);
		} catch (e: unknown) {
			throw new NoFigmaCredentialsError(
				`No credential available for user ${atlassianUserId}`,
			);
		}

		if (credentials.isExpired()) {
			try {
				credentials = await this.refreshCredentials(credentials);
			} catch (e: unknown) {
				throw new RefreshFigmaCredentialsError(
					`Failed to refresh credentials for user ${atlassianUserId}`,
				);
			}
		}
		return credentials;
	};

	/**
	 * Returns an OAuth 2.0 authorization endpoint for the given user.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	buildAuthorizationEndpoint = (
		atlassianUserId: string,
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
			state: atlassianUserId, // TODO: MDTZ-1014: Use an anti-forgery state token to prevent Cross-Site Request Forgery (CSRF) attacks.
			response_type: 'code',
		}).toString();

		return authorizationEndpoint.toString();
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
		});
	};

	private createExpiryDate(expiresInSeconds: number): Date {
		return new Date(Date.now() + expiresInSeconds * 1000);
	}
}

export class NoFigmaCredentialsError extends Error {}

export class RefreshFigmaCredentialsError extends Error {}

export const figmaAuthService = new FigmaAuthService();
