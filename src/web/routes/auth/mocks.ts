import { getConfig } from '../../../config';
import type { FigmaUserCredentialsCreateParams } from '../../../domain/entities';

export const mockUserId = 'authorized-user-id';
export const mockAuthCode = 'code-123';

export const mockFigmaUserCredentialsCreatePayload: FigmaUserCredentialsCreateParams =
	{
		atlassianUserId: mockUserId,
		accessToken: 'access-token',
		refreshToken: 'refresh-token',
		expiresAt: new Date(),
	};

export const mockAuthQueryParams = {
	client_id: getConfig().figma.clientId,
	client_secret: getConfig().figma.clientSecret,
	redirect_uri: `${getConfig().app.baseUrl}/auth/callback`,
	code: mockAuthCode,
	grant_type: 'authorization_code',
};

export const mockFigmaAuthResponse = {
	access_token: 'access_token',
	refresh_token: 'refresh_token',
	expires_in: 999999,
};
