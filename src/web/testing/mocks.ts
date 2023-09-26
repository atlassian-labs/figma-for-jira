import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import type { Method } from 'axios';

import type {
	ConnectInstallation,
	ConnectInstallationCreateParams,
} from '../../domain/entities';

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
	connectInstallation: ConnectInstallation | ConnectInstallationCreateParams;
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
