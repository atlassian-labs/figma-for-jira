import { decodeAsymmetric, getAlgorithm, getKeyId } from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';
import axios from 'axios';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { verifyExp, verifyUrlBoundQsh } from './jwt-utils';
import { CONNECT_JWT_TOKEN_CLAIMS_SCHEMA } from './schemas';

import { isEnumValueOf } from '../../../common/enumUtils';
import { ensureString } from '../../../common/stringUtils';
import { getConfig } from '../../../config';
import { assertSchema, getLogger } from '../../../infrastructure';
import { UnauthorizedError } from '../errors';

/**
 * Authenticates requests using an asymmetric JWT token.
 *
 * @remarks
 * Context JWT tokens are sent with lifecycle callback events by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const connectAsymmetricJwtAuthMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT', '').trim();

	if (!token) {
		return next(new UnauthorizedError('Missing JWT token.'));
	}

	void verifyAsymmetricJwtToken(req, token)
		.then(() => next())
		.catch(next);
};

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
export const verifyAsymmetricJwtToken = async (
	request: Request,
	token: string,
): Promise<void> => {
	try {
		const tokenSigningAlgorithm: unknown = getAlgorithm(token);

		if (!isEnumValueOf(AsymmetricAlgorithm, tokenSigningAlgorithm)) {
			throw new UnauthorizedError('Unsupported JWT signing algorithm.');
		}

		// Decode the JWT token without verification.
		const unverifiedClaims = decodeAsymmetric(
			token,
			'',
			tokenSigningAlgorithm,
			true,
		) as unknown;

		assertSchema(unverifiedClaims, CONNECT_JWT_TOKEN_CLAIMS_SCHEMA);

		const keyId = ensureString(getKeyId(token));
		const publicKey = await queryAtlassianConnectPublicKey(keyId);

		// Decode the JWT token with verification.
		const verifiedClaims = decodeAsymmetric(
			token,
			publicKey,
			tokenSigningAlgorithm,
		) as Record<string, unknown>;

		assertSchema(verifiedClaims, CONNECT_JWT_TOKEN_CLAIMS_SCHEMA);

		verifyUrlBoundQsh(verifiedClaims, request);
		verifyExp(verifiedClaims);

		// Verify that the AUD claim has the correct URL.
		if (!verifiedClaims?.aud?.[0]?.includes(getConfig().app.baseUrl)) {
			throw new UnauthorizedError(
				'The token does not contain or contain an invalid `aud` claim.',
			);
		}
	} catch (e: unknown) {
		getLogger().warn(e, 'Failed to verify the asymmetric JWT token.');

		if (e instanceof UnauthorizedError) throw e;

		throw new UnauthorizedError('Authentication failed.');
	}
};

/**
 * Returns the public key for asymmetric JWT token validation.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#verifying-a-asymmetric-jwt-token-for-install-callbacks
 */
const queryAtlassianConnectPublicKey = async (
	keyId: string,
): Promise<string> => {
	try {
		const response = await axios.get<string>(
			`${getConfig().jira.connectKeyServerUrl}/${keyId}`,
		);
		return response.data;
	} catch (e: unknown) {
		throw new UnauthorizedError(`Unable to get public key for keyId ${keyId}`);
	}
};
