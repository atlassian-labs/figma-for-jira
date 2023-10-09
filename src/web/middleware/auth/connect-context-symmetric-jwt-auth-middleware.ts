import {
	decodeSymmetric,
	getAlgorithm,
	SymmetricAlgorithm,
} from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AuthenticationException } from './jwt-utils';

import { isEnumValueOf } from '../../../common/enumUtils';
import { ensureString } from '../../../common/stringUtils';
import { getLogger } from '../../../infrastructure';
import { connectInstallationRepository } from '../../../infrastructure/repositories';

const CONTEXT_TOKEN_QSH = 'context-qsh';

/**
 * Authenticates requests using a context symmetric JWT token.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * Context JWT tokens are sent by Connect App UI (embed in Jira via extension points) to Connect App API.
 * A context JWT is not tied to a particular URL, so it includes a fixed qsh claim.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
/* eslint-disable-next-line @typescript-eslint/no-misused-promises */
export const connectContextSymmetricJwtAuthMiddleware: RequestHandler = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { connectInstallation, atlassianUserId } =
			await verifyContextSymmetricJwtToken(req);

		res.locals.connectInstallation = connectInstallation;
		res.locals.atlassianUserId = atlassianUserId;

		next();
	} catch (e) {
		getLogger().warn(e, 'Failed to verify a context symmetric JWT token.');

		if (e instanceof AuthenticationException) throw e;

		throw new AuthenticationException('Authentication failed.');
	}
};

const verifyContextSymmetricJwtToken = async (req: Request) => {
	const token = req.headers.authorization?.replace('JWT', '').trim();

	if (!token) {
		throw new AuthenticationException('Missing JWT token.');
	}

	const tokenSigningAlgorithm: unknown = getAlgorithm(token);

	if (!isEnumValueOf(SymmetricAlgorithm, tokenSigningAlgorithm)) {
		throw new AuthenticationException('Unsupported JWT signing algorithm.');
	}

	// Decode jwt token without verification
	const unverifiedClaims = decodeSymmetric(
		token,
		'',
		tokenSigningAlgorithm,
		true,
	) as Record<string, unknown>;

	if (!unverifiedClaims.iss) {
		throw new AuthenticationException('JWT token does not contain `iss`.');
	}

	if (!unverifiedClaims.sub) {
		throw new AuthenticationException('JWT token does not contain `sub`.');
	}

	if (unverifiedClaims.qsh !== CONTEXT_TOKEN_QSH) {
		throw new AuthenticationException(
			'JWT token does not contain or contain invalid `qsh`.',
		);
	}

	const connectInstallation =
		await connectInstallationRepository.getByClientKey(
			ensureString(unverifiedClaims.iss),
		);

	const verifiedClaims = decodeSymmetric(
		token,
		connectInstallation.sharedSecret,
		tokenSigningAlgorithm,
	) as Record<string, unknown>;

	return {
		connectInstallation,
		atlassianUserId: ensureString(verifiedClaims.sub),
	};
};
