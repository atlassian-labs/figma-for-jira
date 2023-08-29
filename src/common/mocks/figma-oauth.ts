import { v4 as uuidv4 } from 'uuid';

import {
	FigmaOAuth2UserCredentials,
	FigmaUserCredentialsCreateParams,
} from '../../domain/entities';
import {
	GetOAuth2TokenResponse,
	RefreshOAuth2TokenResponse,
} from '../../infrastructure/figma/figma-client';

export const generateFigmaOAuth2UserCredentials = ({
	id = Date.now(),
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(),
} = {}): FigmaOAuth2UserCredentials =>
	new FigmaOAuth2UserCredentials(
		id,
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	);

export const generateFigmaUserCredentialsCreateParams = ({
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000),
} = {}): FigmaUserCredentialsCreateParams => ({
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresAt,
});

export const generateGetOAuth2TokenResponse = ({
	access_token = uuidv4(),
	refresh_token = uuidv4(),
	expires_in = 90 * 60 * 60,
} = {}): GetOAuth2TokenResponse => ({
	access_token,
	refresh_token,
	expires_in,
});

export const generateRefreshOAuth2TokenResponse = ({
	access_token = uuidv4(),
	expires_in = 90 * 60 * 60,
} = {}): RefreshOAuth2TokenResponse => ({
	access_token,
	expires_in,
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
