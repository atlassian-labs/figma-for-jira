import { v4 as uuidv4 } from 'uuid';

import {
	FigmaOAuth2UserCredentials,
	FigmaUserCredentialsCreateParams,
} from '..';

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
