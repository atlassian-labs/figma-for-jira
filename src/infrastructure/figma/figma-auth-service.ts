import { FigmaOAuth2UserCredentials } from '../../domain/entities';
import { figmaClient } from './figma-client';
import { figmaOAuthUserCredentialsRepository } from '../repositories';

export class FigmaAuthService {
	createCredentials = async (
		code: string,
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.getOAuth2Token(code);

		return await figmaOAuthUserCredentialsRepository.upsert({
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
			await figmaOAuthUserCredentialsRepository.find(atlassianUserId);

		if (!credentials) return null;

		if (credentials.refreshRequired) {
			credentials = await this.refreshCredentials(credentials);
			// TODO: Update credentials in the database.
		}

		return credentials;
	};

	private refreshCredentials = async (
		credentials: FigmaOAuth2UserCredentials,
	) => {
		// TODO: Refresh the token here.
		return credentials;
	};
}

export const figmaAuthService = new FigmaAuthService();
