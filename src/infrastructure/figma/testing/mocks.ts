import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../common/duration';
import {
	GetOAuth2TokenResponse,
	RefreshOAuth2TokenResponse,
} from '../figma-client';

export const generateGetOAuth2TokenResponse = ({
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresIn = Duration.ofMinutes(90),
} = {}): GetOAuth2TokenResponse => ({
	access_token: accessToken,
	refresh_token: refreshToken,
	expires_in: expiresIn.asSeconds,
});

export const generateRefreshOAuth2TokenResponse = ({
	accessToken = uuidv4(),
	expiresIn = Duration.ofMinutes(90),
} = {}): RefreshOAuth2TokenResponse => ({
	access_token: accessToken,
	expires_in: expiresIn.asSeconds,
});

export const generateGetOAuth2TokenQueryParams = ({
	client_id = 'client-id',
	client_secret = 'client-secret',
	redirect_uri = 'https://www.example.com/auth/callback',
	code = 'code-123',
	grant_type = 'authorization_code',
} = {}) => ({
	client_id,
	client_secret,
	redirect_uri,
	code,
	grant_type,
});

export const generateRefreshOAuth2TokenQueryParams = ({
	client_id = 'client-id',
	client_secret = 'client-secret',
	refresh_token = 'refresh_token',
} = {}) => ({
	client_id,
	client_secret,
	refresh_token,
});
