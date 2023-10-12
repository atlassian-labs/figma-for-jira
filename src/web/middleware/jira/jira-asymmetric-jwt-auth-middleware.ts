import { decodeAsymmetric, getAlgorithm, getKeyId } from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';
import axios from 'axios';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import {
	verifyAudClaimContainsBaseUrl,
	verifyExpClaim,
	verifyQshClaimBoundToUrl,
} from './jwt-utils';
import { CONNECT_JWT_CLAIMS_SCHEMA } from './schemas';

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
export const jiraAsymmetricJwtAuthMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT ', '');

	if (!token) {
		return next(new UnauthorizedError('Missing JWT token.'));
	}

	void verifyAsymmetricJwtToken(token, req)
		.then(() => next())
		.catch(next);
};

/**
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
export const verifyAsymmetricJwtToken = async (
	token: string,
	request: Request,
): Promise<void> => {
	try {
		const tokenSigningAlgorithm = getAlgorithm(token) as unknown;

		if (!isEnumValueOf(AsymmetricAlgorithm, tokenSigningAlgorithm)) {
			throw new UnauthorizedError('Unsupported JWT signing algorithm.');
		}

		// Decode a JWT token without verification.
		const unverifiedClaims = decodeAsymmetric(
			token,
			'',
			tokenSigningAlgorithm,
			true,
		) as unknown;

		assertSchema(unverifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);

		const keyId = ensureString(getKeyId(token));
		const publicKey = await queryAtlassianConnectPublicKey(keyId);

		// Decode the JWT token with verification.
		const verifiedClaims = decodeAsymmetric(
			token,
			publicKey,
			tokenSigningAlgorithm,
		) as unknown;

		assertSchema(verifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);
		verifyQshClaimBoundToUrl(verifiedClaims, request);
		verifyExpClaim(verifiedClaims);
		verifyAudClaimContainsBaseUrl(verifiedClaims, getConfig().app.baseUrl);
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
