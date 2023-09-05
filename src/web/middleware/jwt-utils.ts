/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call */
import {
	createQueryStringHash,
	decodeAsymmetric,
	decodeSymmetric,
	getAlgorithm,
	getKeyId,
} from 'atlassian-jwt';
import type { Request } from 'atlassian-jwt/dist/lib/jwt';

import { getConfig } from '../../config';
import type { ConnectInstallation } from '../../domain/entities';
import { getLogger } from '../../infrastructure';
import { connectInstallationRepository } from '../../infrastructure/repositories';

export class JwtVerificationError extends Error {
	constructor(message: string) {
		super(message);
	}
}

export class InstallationNotFoundError extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 * This decodes the JWT token from Jira, verifies it against the jira tenant's shared secret
 * And returns the verified Jira tenant if it passes
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
export const verifySymmetricJWTToken = async (
	request: Request,
	token?: string,
): Promise<ConnectInstallation> => {
	if (!token) {
		throw new JwtVerificationError('Missing JWT token');
	}

	// Decode jwt token without verification
	const data = decodeSymmetric(token, '', getAlgorithm(token), true);
	const installation = await connectInstallationRepository.getByClientKey(
		data.iss,
	);

	if (!installation) {
		throw new InstallationNotFoundError('Installation not found for tenant');
	}

	try {
		const verifiedToken = decodeSymmetric(
			token,
			installation.sharedSecret,
			getAlgorithm(token),
		);
		await validateQsh(verifiedToken.qsh, request);

		return installation;
	} catch (err) {
		throw new JwtVerificationError('JWT verification failed');
	}
};

/**
 * This decodes the JWT token from Jira, verifies it based on the connect public key
 * This is used for installed and uninstalled lifecycle events
 * https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 */
export const verifyAsymmetricJWTToken = async (
	request: Request,
	token?: string,
): Promise<void> => {
	// if JWT is missing, return a 401
	if (!token) {
		return Promise.reject({
			status: 401,
			message: 'Missing JWT token',
		});
	}

	const publicKey = await queryAtlassianConnectPublicKey(getKeyId(token));
	const unverifiedClaims = decodeAsymmetric(
		token,
		publicKey,
		getAlgorithm(token),
		true,
	);

	if (!unverifiedClaims.iss) {
		return Promise.reject({
			status: 401,
			message: 'JWT claim did not contain the issuer (iss) claim',
		});
	}

	// Make sure the AUD claim has the correct URL
	if (!unverifiedClaims?.aud?.[0]?.includes(getConfig().app.baseUrl)) {
		return Promise.reject({
			status: 401,
			message: 'JWT claim did not contain the correct audience (aud) claim',
		});
	}

	const verifiedClaims = decodeAsymmetric(
		token,
		publicKey,
		getAlgorithm(token),
	);

	// If claim doesn't have QSH, reject
	if (!verifiedClaims.qsh) {
		return Promise.reject({
			status: 401,
			message: 'JWT validation Failed, no qsh',
		});
	}

	// Check that claim is still within expiration, give 3 second leeway in case of time drift
	if (verifiedClaims.exp && Date.now() / 1000 - 3 >= verifiedClaims.exp) {
		return Promise.reject({
			status: 401,
			message: 'JWT validation failed, token is expired',
		});
	}

	await validateQsh(verifiedClaims.qsh, request);
};

// Check to see if QSH from token is the same as the request
const validateQsh = async (qsh: string, request: Request): Promise<void> => {
	getLogger().debug(request, 'request');
	if (qsh !== 'context-qsh' && qsh !== createQueryStringHash(request, false)) {
		return Promise.reject({
			status: 401,
			message: 'JWT Verification Failed, wrong qsh',
		});
	}
};

/**
 * Queries the public key for the specified keyId
 */
const queryAtlassianConnectPublicKey = async (
	keyId: string,
): Promise<string> => {
	const response = await fetch(
		`https://connect-install-keys.atlassian.com/${keyId}`,
	);
	if (response.status !== 200) {
		return Promise.reject({
			status: 401,
			message: `Unable to get public key for keyId ${keyId}`,
		});
	}
	return response.text();
};
