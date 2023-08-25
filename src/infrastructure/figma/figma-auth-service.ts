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
			expiresAt: new Date(Date.now() + response.expires_in * 1000),
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
		let credentials =
			await figmaOAuth2UserCredentialsRepository.find(atlassianUserId);

		if (!credentials)
			throw new NoFigmaCredentialsError(
				'No credential available for the current user.',
			);

		if (credentials.isExpired()) {
			credentials = await this.refreshCredentials(credentials);
			// TODO: Update credentials in the database.
		}

		return credentials;
	};

	private refreshCredentials = async (
		credentials: FigmaOAuth2UserCredentials,
		// eslint-disable-next-line @typescript-eslint/require-await
	): Promise<FigmaOAuth2UserCredentials> => {
		// TODO: Implement token refresh here.
		return credentials;
	};
}

export class NoFigmaCredentialsError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export const figmaAuthService = new FigmaAuthService();
