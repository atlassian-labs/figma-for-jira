import axios from 'axios';

import { getConfig } from '../../config';
import { getLogger } from '../logger';

export type GetOAuth2TokenResponse = {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
};

export type RefreshOAuth2TokenResponse = Omit<
	GetOAuth2TokenResponse,
	'refresh_token'
>;

export type MeResponse = {
	readonly id: string;
	readonly email: string;
	readonly handle: string;
	readonly img_url: string;
};

/**
 * A generic Figma API client.
 *
 * @see https://www.figma.com/developers/api
 * @internal
 */
export class FigmaClient {
	/**
	 * Returns the user's access token.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	getOAuth2Token = async (code: string): Promise<GetOAuth2TokenResponse> => {
		try {
			const params = new URLSearchParams();
			params.append('client_id', getConfig().figma.clientId);
			params.append('client_secret', getConfig().figma.clientSecret);
			params.append('redirect_uri', `${getConfig().app.baseUrl}/auth/callback`);
			params.append('code', code);
			params.append('grant_type', 'authorization_code');

			const response = await axios.post<GetOAuth2TokenResponse>(
				`${getConfig().figma.oauthApiBaseUrl}/api/oauth/token`,
				null,
				{
					params,
				},
			);

			return response.data;
		} catch (error: unknown) {
			getLogger().error(`Failed to exchange code for access token.`, error);
			throw error;
		}
	};

	/**
	 * Request a new access token using a refresh token.
	 *
	 * @see https://www.figma.com/developers/api#refresh-oauth2
	 */
	refreshOAuth2Token = async (
		refreshToken: string,
	): Promise<RefreshOAuth2TokenResponse> => {
		try {
			const params = new URLSearchParams();
			params.append('client_id', getConfig().figma.clientId);
			params.append('client_secret', getConfig().figma.clientSecret);
			params.append('refresh_token', refreshToken);

			const response = await axios.post<RefreshOAuth2TokenResponse>(
				`${getConfig().figma.oauthApiBaseUrl}/api/oauth/refresh`,
				null,
				{ params },
			);

			return response.data;
		} catch (error: unknown) {
			getLogger().error(`Failed to refresh access token.`, error);
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
			`${getConfig().figma.apiBaseUrl}/v1/me`,
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
