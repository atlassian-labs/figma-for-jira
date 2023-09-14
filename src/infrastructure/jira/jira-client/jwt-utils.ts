import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';

import type { Duration } from '../../../common/duration';

export type JwtTokenParams = {
	readonly request: {
		readonly method: string;
		readonly pathname?: string;
		readonly query?: Record<string, unknown>;
		readonly body?: Record<string, unknown>;
	};
	readonly connectClientKey: string;
	readonly connectSharedSecret: string;
	readonly expiresIn: Duration;
};

/**
 * Creates a new symmetric JWT token using HS256 encoding with the Connect App shared secret.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
 */
export const createJwtToken = (params: JwtTokenParams): string => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + params.expiresIn.asSeconds,
			iss: params.connectClientKey,
			qsh: createQueryStringHash(params.request),
		},
		params.connectSharedSecret,
	);
};
