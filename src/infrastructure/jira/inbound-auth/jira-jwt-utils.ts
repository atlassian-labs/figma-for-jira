import { createQueryStringHash } from 'atlassian-jwt';

import { Duration } from '../../../common/duration';
import { getAppBaseUrl } from '../../../config';

const TOKEN_EXPIRATION_LEEWAY = Duration.ofSeconds(3);

/**
 * Verifies the `qsh` claim to ensure that the query has not been tampered by creating a query hash and comparing
 * 	it against the `qsh` claim.
 *
 * @throws {Error} The token contains an invalid `qsh` claim.
 */
export const verifyQshClaimBoundToUrl = (
	{ qsh }: { qsh: string },
	request: {
		method: string;
		pathname?: string;
		query?: Record<string, unknown>;
	},
) => {
	if (
		qsh !== createQueryStringHash(request, false, getAppBaseUrl().toString())
	) {
		throw new Error('The token contains an invalid `qsh` claim.');
	}
};

/**
 * Verifies the `exp` claim to ensure that the token is still within expiration.
 * It gives a several second leeway in case of time drift.
 *
 * @throws {Error} The token is expired.
 */
export const verifyExpClaim = ({ exp }: { exp: number }) => {
	const nowInSeconds = Date.now() / 1000;

	if (nowInSeconds > exp + TOKEN_EXPIRATION_LEEWAY.asSeconds) {
		throw new Error('The token is expired.');
	}
};

/**
 * @throws {Error} The token contains an invalid `aud` claim.
 */
export const verifyAudClaimIncludesBaseUrl = (
	{ aud }: { aud: string | string[] },
	baseUrl: string,
) => {
	if (!aud?.[0]?.includes(baseUrl)) {
		throw new Error('The token contains an invalid `aud` claim.');
	}
};
