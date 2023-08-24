import axios from 'axios';

import { logger } from '../logger';

import config from '../../config';

type GetOAuth2TokenResponse = {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
};

type MeResponse = {
	readonly id: string;
	readonly email: string;
	readonly handle: string;
	readonly img_url: string;
};

export class FigmaClient {
	/**
	 * Returns the user's access token.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	getOAuth2Token = async (code: string): Promise<GetOAuth2TokenResponse> => {
		try {
			const params = new URLSearchParams();
			params.append('client_id', config.figma.clientId);
			params.append('client_secret', config.figma.clientSecret);
			params.append('redirect_uri', `${config.app.baseUrl}/auth/callback`);
			params.append('code', code);
			params.append('grant_type', 'authorization_code');

			const response = await axios.post<GetOAuth2TokenResponse>(
				`${config.figma.oauthApiBaseUrl}/api/oauth/token`,
				null,
				{
					params,
				},
			);

			return response.data;
		} catch (error) {
			logger.error(`Failed to exchange code for access token ${error}`, error);
			throw error;
		}
	};

	/**
	 * Returns user information for the authenticated user.
	 *
	 * @see https://www.figma.com/developers/api#get-me-endpoint
	 */
	me = async (accessToken: string): Promise<MeResponse> => {
		const response = await axios.get<MeResponse>(
			`${config.figma.apiBaseUrl}/v1/me`,
			{
				headers: {
					['Authorization']: `Bearer ${accessToken}`,
				},
			},
		);

		return response.data;
	};
}

export const figmaClient = new FigmaClient();
