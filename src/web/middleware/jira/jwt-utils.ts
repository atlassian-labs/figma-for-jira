import { createQueryStringHash, fromExpressRequest } from 'atlassian-jwt';
import type { Request } from 'express';

import { Duration } from '../../../common/duration';
import { UnauthorizedError } from '../errors';

const TOKEN_EXPIRATION_LEEWAY = Duration.ofSeconds(3);

export const verifyIss = ({ iss }: { iss: string }) => {
	if (!iss) {
		throw new UnauthorizedError('The token contains an invalid `iss` claim.');
	}
};

/**
 * Verifies the `exp` claim to ensure that the token is still within expiration.
 * It gives a several second leeway in case of time drift.
 */
export const verifyExp = ({ exp }: { exp: number }) => {
	const nowInSeconds = Date.now() / 1000;

	if (nowInSeconds > exp + TOKEN_EXPIRATION_LEEWAY.asSeconds) {
		throw new UnauthorizedError('The token is expired.');
	}
};

/**
 * Verifies the `qsh` claim to ensure that the query has not been tampered by creating a query hash and comparing
 * 	it against the `qsh` claim.
 */
export const verifyUrlBoundQsh = (
	{ qsh }: { qsh: string },
	request: Request,
) => {
	if (qsh !== createQueryStringHash(fromExpressRequest(request), false)) {
		throw new UnauthorizedError('The token contains an invalid `qsh` claim.');
	}
};

export const verifyFixedQsh = ({ qsh }: { qsh: string }, value: string) => {
	if (qsh !== value) {
		throw new UnauthorizedError('The token contains an invalid `qsh` claim.');
	}
};
