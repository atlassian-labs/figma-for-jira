import type { Params } from 'atlassian-jwt';
import {
	createQueryStringHash,
	encodeAsymmetric,
	encodeSymmetric,
} from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';
import type { Method } from 'axios';

import { generateKeyPair } from 'node:crypto';
import { promisify } from 'util';

/**
 * Generates an asymmetric JWT token that can be used to authorise lifecycle event requests in
 * integration tests.
 *
 * @remarks
 * In order to use a generated token in integration tests, you might also need to mock the
 * `https://connect-install-keys.atlassian.com/:kid` endpoint:
 * https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateInboundRequestAsymmetricJwtToken = async ({
	keyId,
	pathname,
	method,
	connectInstallation: { baseUrl, clientKey },
}: {
	keyId: string;
	pathname: string;
	method: Method;
	connectInstallation: {
		baseUrl: string;
		clientKey: string;
	};
}): Promise<{ jwtToken: string; privateKey: string; publicKey: string }> => {
	const generateKeyPairPromisified = promisify(generateKeyPair);

	const { publicKey, privateKey } = await generateKeyPairPromisified('rsa', {
		modulusLength: 1024,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem',
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
		},
	});

	const nowInSeconds = Math.floor(Date.now() / 1000);
	const jwtToken = encodeAsymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + 99999,
			iss: clientKey,
			qsh: createQueryStringHash({ pathname, method }),
			aud: [baseUrl],
		},
		privateKey,
		AsymmetricAlgorithm.RS256,
		{
			kid: keyId,
		},
	);

	return { jwtToken, privateKey, publicKey };
};

/**
 * Generates a symmetric JWT token that can be used to authorise inbound requests in
 * integration tests.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateInboundRequestSymmetricJwtToken = ({
	pathname,
	method,
	query,
	connectInstallation: { clientKey, sharedSecret },
}: {
	method: Method;
	pathname: string;
	query?: Params;
	connectInstallation: {
		clientKey: string;
		sharedSecret: string;
	};
}) => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + 99999,
			iss: clientKey,
			qsh: createQueryStringHash({ method, pathname, query }),
		},
		sharedSecret,
	);
};
