import { encodeSymmetric } from 'atlassian-jwt';

import { Duration } from '../../../common/duration';

/**
 * Generates a context symmetric JWT token.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateConnectContextSymmetricJwtToken = ({
	atlassianUserId,
	connectInstallation: { clientKey, sharedSecret },
}: {
	atlassianUserId: string;
	connectInstallation: {
		clientKey: string;
		sharedSecret: string;
	};
}) => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + Duration.ofMinutes(3).asSeconds,
			iss: clientKey,
			sub: atlassianUserId,
			qsh: 'context-qsh',
		},
		sharedSecret,
	);
};
