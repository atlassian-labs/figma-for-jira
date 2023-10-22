import { encodeSymmetric } from 'atlassian-jwt';

import { Duration } from '../../common/duration';

/**
 * Generates a Figma OAuth2.0 state parameter.
 *
 * @see https://www.figma.com/developers/api#authentication
 */
export const generateFigmaOAuth2State = ({
	atlassianUserId,
	appBaseUrl,
	connectClientKey,
	secretKey,
}: {
	atlassianUserId: string;
	appBaseUrl: string;
	connectClientKey: string;
	secretKey: string;
}) => {
	const NOW_IN_SECONDS = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: NOW_IN_SECONDS,
			exp: NOW_IN_SECONDS + Duration.ofMinutes(3).asSeconds,
			iss: connectClientKey,
			sub: atlassianUserId,
			aud: appBaseUrl,
		},
		secretKey,
	);
};
