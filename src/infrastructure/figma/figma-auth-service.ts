import { figmaClient } from './figma-client';

import { FigmaOAuth2UserCredentials } from '../../domain/entities';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

export class FigmaAuthService {
	createCredentials = async (
		code: string,
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.getOAuth2Token(code);

		return await figmaOAuth2UserCredentialsRepository.upsert({
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresAt: new Date(Date.now() + response.expires_in * 1000),
			atlassianUserId,
		});
	};

	getCredentials = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials | null> => {
		let credentials =
			await figmaOAuth2UserCredentialsRepository.find(atlassianUserId);

		if (!credentials) return null;

		if (credentials.refreshRequired) {
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

export const figmaAuthService = new FigmaAuthService();
