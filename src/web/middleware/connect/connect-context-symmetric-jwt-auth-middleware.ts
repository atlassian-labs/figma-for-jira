import {
	decodeSymmetric,
	getAlgorithm,
	SymmetricAlgorithm,
} from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { verifyExp, verifyFixedQsh } from './jwt-utils';
import { CONNECT_JWT_TOKEN_CLAIMS_SCHEMA } from './schemas';

import { isEnumValueOf } from '../../../common/enumUtils';
import { ensureString } from '../../../common/stringUtils';
import { assertSchema, getLogger } from '../../../infrastructure';
import { connectInstallationRepository } from '../../../infrastructure/repositories';
import { UnauthorizedError } from '../errors';

const CONTEXT_TOKEN_QSH = 'context-qsh';

/**
 * Authenticates requests using a context symmetric JWT token.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * Context JWT tokens are sent by Connect App UI embed in Jira via extension points.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
export const connectContextSymmetricJwtAuthMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT', '').trim();

	if (!token) {
		return next(new UnauthorizedError('Missing JWT token.'));
	}

	void verifyContextSymmetricJwtToken(token)
		.then(({ connectInstallation, atlassianUserId }) => {
			res.locals.connectInstallation = connectInstallation;
			res.locals.atlassianUserId = atlassianUserId;
			next();
		})
		.then(next);
};

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
const verifyContextSymmetricJwtToken = async (token: string) => {
	try {
		const tokenSigningAlgorithm: unknown = getAlgorithm(token);

		if (!isEnumValueOf(SymmetricAlgorithm, tokenSigningAlgorithm)) {
			throw new UnauthorizedError('Unsupported JWT signing algorithm.');
		}

		// Decode jwt token without verification
		const unverifiedClaims = decodeSymmetric(
			token,
			'',
			tokenSigningAlgorithm,
			true,
		) as unknown;

		assertSchema(unverifiedClaims, CONNECT_JWT_TOKEN_CLAIMS_SCHEMA);

		const connectInstallation =
			await connectInstallationRepository.getByClientKey(
				ensureString(unverifiedClaims.iss),
			);

		const verifiedClaims = decodeSymmetric(
			token,
			connectInstallation.sharedSecret,
			tokenSigningAlgorithm,
		) as unknown;

		assertSchema(verifiedClaims, CONNECT_JWT_TOKEN_CLAIMS_SCHEMA);

		verifyFixedQsh(verifiedClaims, CONTEXT_TOKEN_QSH);
		verifyExp(verifiedClaims);

		return {
			connectInstallation,
			atlassianUserId: ensureString(verifiedClaims.sub),
		};
	} catch (e) {
		getLogger().warn(e, 'Failed to verify the context symmetric JWT token.');

		if (e instanceof UnauthorizedError) throw e;

		throw new UnauthorizedError('Authentication failed.');
	}
};
