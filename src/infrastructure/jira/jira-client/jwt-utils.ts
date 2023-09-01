import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import { Duration } from '../../../common/duration';

export type JwtTokenParams = {
	readonly request: {
		readonly method: string;
		readonly pathname?: string;
		readonly query?: Record<string, unknown>;
		readonly body?: Record<string, unknown>;
	};
	readonly connectAppKey: string;
	readonly connectSharedSecret: string;
	readonly expiresIn: Duration;
};

/**
 * Creates a new symmetric JWT token using a Connect App shared secret.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/
 */
export const createJwtToken = (params: JwtTokenParams): string => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	const jwtToken = encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + params.expiresIn.asSeconds,
			iss: params.connectAppKey,
			qsh: createQueryStringHash(params.request),
		},
		params.connectSharedSecret,
	);

	return jwtToken;
};
