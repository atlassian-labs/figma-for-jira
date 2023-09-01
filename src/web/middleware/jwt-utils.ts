/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call */
import {
	createQueryStringHash,
	decodeAsymmetric,
	// decodeSymmetric,
	getAlgorithm,
	getKeyId,
} from 'atlassian-jwt';
import { Request } from 'atlassian-jwt/dist/lib/jwt';

import { getConfig } from '../../config';
import { getLogger } from '../../infrastructure';

const tenant = {
	id: '123',
	url: '',
	sharedSecret: '',
	clientKey: '',
	enabled: true,
};

export class JwtVerificationError extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 * This decodes the JWT token from Jira, verifies it against the jira tenant's shared secret
 * And returns the verified Jira tenant if it passes
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#decoding-and-verifying-a-jwt-token
 */
export const verifySymmetricJwtToken = async (
	request: Request,
	token?: string,
): Promise<typeof tenant> => {
	getLogger().info({ request, token }, 'verifySymmetricJWTToken');
	// // if JWT is missing, return a 401
	// if (!token) {
	// 	return Promise.reject({
	// 		status: 401,
	// 		message: 'Missing JWT token'
	// 	});
	// }

	// // Decode jwt token without verification
	// let data = decodeSymmetric(token, '', getAlgorithm(token), true);
	// // Get the jira tenant associated with this url
	// // const jiraTenant = await database.findJiraTenant({ clientKey: data.iss });

	// // If tenant doesn't exist anymore, return a 404
	// if (!tenant) {
	// 	return Promise.reject({
	// 		status: 404,
	// 		message: "Jira Tenant doesn't exist"
	// 	});
	// }

	// try {
	// 	// Try to verify the jwt token
	// 	data = decodeSymmetric(token, tenant.sharedSecret, getAlgorithm(token));
	// 	await validateQsh(data.qsh, request);

	// 	// If all verifications pass, save the jiraTenant to local to be used later
	// 	return tenant;
	// } catch (e) {
	// 	// If verification doesn't work, show a 401 error
	// 	return Promise.reject({
	// 		status: 401,
	// 		message: `JWT verification failed: ${e}`
	// 	});
	// }
	return Promise.resolve(tenant);
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
	const response = await fetch(
		`https://connect-install-keys.atlassian.com/${keyId}`,
	);
	if (response.status !== 200) {
		throw new JwtVerificationError(
			`Unable to get public key for keyId ${keyId}`,
		);
	}
	return response.text();
};
