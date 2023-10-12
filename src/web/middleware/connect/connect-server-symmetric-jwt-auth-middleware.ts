import {
	decodeSymmetric,
	getAlgorithm,
	SymmetricAlgorithm,
} from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { verifyExp, verifyUrlBoundQsh } from './jwt-utils';
import { CONNECT_JWT_TOKEN_CLAIMS_SCHEMA } from './schemas';

import { isEnumValueOf } from '../../../common/enumUtils';
import { ensureString } from '../../../common/stringUtils';
import { assertSchema, getLogger } from '../../../infrastructure';
import { connectInstallationRepository } from '../../../infrastructure/repositories';
import { UnauthorizedError } from '../errors';

/**
 * Authenticates requests using an iframe or server-to-server symmetric JWT token.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * An iframe or server-to-server symmetric JWT tokens are sent by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
/* eslint-disable-next-line @typescript-eslint/no-misused-promises */
export const connectServerSymmetricJwtAuthMiddleware: RequestHandler = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT', '').trim();

	if (!token) {
		return next(new UnauthorizedError('Missing JWT token.'));
	}

	try {
		const { connectInstallation } = await verifyServerSymmetricJwtToken(
			req,
			token,
		);

		res.locals.connectInstallation = connectInstallation;

		next();
	} catch (e) {
		next(e);
	}
};

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
const verifyServerSymmetricJwtToken = async (
	request: Request,
	token: string,
) => {
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

		verifyUrlBoundQsh(verifiedClaims, request);
		verifyExp(verifiedClaims);

		return {
			connectInstallation,
		};
	} catch (e) {
		getLogger().warn(e, 'Failed to verify the server symmetric JWT token.');

		if (e instanceof UnauthorizedError) throw e;

		throw new UnauthorizedError('Authentication failed.');
	}
};
