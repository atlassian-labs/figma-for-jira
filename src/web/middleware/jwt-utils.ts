/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call */
import {
	createQueryStringHash,
	decodeAsymmetric,
	decodeSymmetric,
	getAlgorithm,
	getKeyId,
} from 'atlassian-jwt';
import type { Request } from 'atlassian-jwt/dist/lib/jwt';
import axios from 'axios';

import { getConfig } from '../../config';
import type { ConnectInstallation } from '../../domain/entities';
import {
	connectInstallationRepository,
	RepositoryRecordNotFoundError,
} from '../../infrastructure/repositories';

export class JwtVerificationError extends Error {}

/**
 * This decodes the JWT token from Jira, verifies it against the jira tenant's shared secret
 * And returns the verified Jira tenant if it passes
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
export const verifySymmetricJwtToken = async (
	request: Request,
	token?: string,
): Promise<ConnectInstallation> => {
	if (!token) {
		throw new JwtVerificationError('Missing JWT token');
	}

	// Decode jwt token without verification
	const data = decodeSymmetric(token, '', getAlgorithm(token), true);

	let installation: ConnectInstallation;
	try {
		installation = await connectInstallationRepository.getByClientKey(data.iss);
	} catch (e: unknown) {
		if (e instanceof RepositoryRecordNotFoundError) {
			throw new JwtVerificationError(
				`ConnectInstallation not found for clientKey ${data.iss}`,
			);
		}
		throw e;
	}

	const verifiedToken = decodeSymmetric(
		token,
		installation.sharedSecret,
		getAlgorithm(token),
	);

	validateQsh(verifiedToken.qsh, request);

	return installation;
};

/**
 * This decodes the JWT token from Jira, verifies it based on the connect public key
 * This is used for installed and uninstalled lifecycle events
 * https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 */
export const verifyAsymmetricJwtToken = async (
	request: Request,
	token?: string,
): Promise<void> => {
	if (!token) {
		throw new JwtVerificationError('Missing JWT token');
	}

	const publicKey = await queryAtlassianConnectPublicKey(getKeyId(token));
	const unverifiedClaims = decodeAsymmetric(
		token,
		publicKey,
		getAlgorithm(token),
		true,
	);

	if (!unverifiedClaims.iss) {
		throw new JwtVerificationError(
			'JWT claim did not contain the issuer (iss) claim',
		);
	}

	// Make sure the AUD claim has the correct URL
	if (!unverifiedClaims?.aud?.[0]?.includes(getConfig().app.baseUrl)) {
		throw new JwtVerificationError(
			'JWT claim did not contain the correct audience (aud) claim',
		);
	}

	const verifiedClaims = decodeAsymmetric(
		token,
		publicKey,
		getAlgorithm(token),
	);

	// If claim doesn't have QSH, reject
	if (!verifiedClaims.qsh) {
		throw new JwtVerificationError('JWT validation failed, no qsh claim');
	}

	// Check that claim is still within expiration, give 3 second leeway in case of time drift
	if (verifiedClaims.exp && Date.now() / 1000 - 3 >= verifiedClaims.exp) {
		throw new JwtVerificationError('JWT validation failed, token is expired');
	}

	validateQsh(verifiedClaims.qsh, request);
};

// Check to see if QSH from token is the same as the request
const validateQsh = (qsh: string, request: Request): void => {
	if (qsh !== 'context-qsh' && qsh !== createQueryStringHash(request, false)) {
		throw new JwtVerificationError('JWT verification failed, wrong qsh');
	}
};

/**
 * Queries the public key for the specified keyId
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
		throw new JwtVerificationError(
			`Unable to get public key for keyId ${keyId}`,
		);
	}
};
