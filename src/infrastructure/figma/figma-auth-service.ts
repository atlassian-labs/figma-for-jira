import { figmaClient } from './figma-client';

import { FigmaOAuth2UserCredentials } from '../../domain/entities';
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

export class NoFigmaCredentialsError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class RefreshFigmaCredentialsError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export const figmaAuthService = new FigmaAuthService();
