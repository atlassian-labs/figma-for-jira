import axios from 'axios';

import { logger } from './logger';

import config from '../config';
import { OAuthUserCredentialsCreateParams } from '../domain/entities';

const FIGMA_OAUTH_BASE_URL = 'https://www.figma.com/api/oauth/token';

const buildParams = (code: string) => {
	const params = new URLSearchParams();
	params.append('client_id', config.oauth.clientId);
	params.append('client_secret', config.oauth.clientSecret);
	params.append('redirect_uri', `${config.app.baseUrl}/auth/callback`);
	params.append('code', code);
	params.append('grant_type', 'authorization_code');
	return params;
};

type GetOAuthTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

const mapToDomainType = (
	response: GetOAuthTokenResponse,
	state: string,
): OAuthUserCredentialsCreateParams => {
	return {
		accessToken: response.access_token,
		refreshToken: response.refresh_token,
		expiresIn: response.expires_in,
		atlassianUserId: state,
	};
};

export const figmaClient = {
	exchangeCodeForAccessToken: async (
		code: string,
		state: string,
	): Promise<OAuthUserCredentialsCreateParams> => {
		try {
			console.log('before');
			const { data } = await axios.post<GetOAuthTokenResponse>(
				FIGMA_OAUTH_BASE_URL,
				null,
				{
					params: buildParams(code),
				},
			);
			console.log('data', data);
			return mapToDomainType(data, state);
		} catch (error) {
			logger.error(`Failed to exchange code for access token ${error}`, error);
			throw error;
		}
	},
};
