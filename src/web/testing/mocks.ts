import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import type { Method } from 'axios';

/**
 * Generates a JWT token that can be used to authorise inbound requests in
 * integration tests.
 */
export const generateInboundRequestJwtToken = ({
	pathname,
	method,
	connectInstallation: { clientKey, sharedSecret },
}: {
	pathname: string;
	method: Method;
	connectInstallation: {
		clientKey: string;
		sharedSecret: string;
	};
}) => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + 99999,
			iss: clientKey,
			qsh: createQueryStringHash({ pathname, method }),
		},
		sharedSecret,
	);
};
