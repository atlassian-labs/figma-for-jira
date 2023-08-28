import { getConfig } from '../../../config';
import type { FigmaUserCredentialsCreateParams } from '../../../domain/entities';

export const mockUserId = 'authorized-user-id';
export const mockAuthCode = 'code-123';

export const mockFigmaUserCredentialsCreatePayload: FigmaUserCredentialsCreateParams =
	{
		atlassianUserId: mockUserId,
		accessToken: 'access-token',
		refreshToken: 'refresh-token',
		expiresAt: new Date(Date.now() + 120 * 60 * 1000),
	};

export const mockExpiredFigmaUserCredentialsCreatePayload: FigmaUserCredentialsCreateParams =
	{
		atlassianUserId: mockUserId,
		accessToken: 'expired-access-token',
		refreshToken: 'refresh-token',
		expiresAt: new Date(Date.now() - 30 * 60 * 1000),
	};

export const mockAuthQueryParams = {
	client_id: getConfig().figma.clientId,
	client_secret: getConfig().figma.clientSecret,
	redirect_uri: `${getConfig().app.baseUrl}/auth/callback`,
	code: mockAuthCode,
	grant_type: 'authorization_code',
};

export const mockRefreshQueryParams = {
	client_id: getConfig().figma.clientId,
	client_secret: getConfig().figma.clientSecret,
	refresh_token: 'refresh-token',
};

export const mockFigmaRefreshAuthResponse = {
	access_token: 'access-token',
	expires_in: 999999,
};

export const mockFigmaAuthResponse = {
	...mockFigmaRefreshAuthResponse,
	refresh_token: 'refresh-token',
};
