import {
	createQueryStringHash,
	encodeAsymmetric,
	encodeSymmetric,
} from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';

import { generateKeyPair } from 'node:crypto';
import { promisify } from 'util';

import { Duration } from '../../../common/duration';

/**
 * Generates an asymmetric JWT token.
 *
 * @remarks
 * In order to use a generated token in integration tests, you might need to mock the
 * `https://connect-install-keys.atlassian.com/:kid` endpoint. See for more detail:
 * https://developer.atlassian.com/cloud/jira/platform/security-for-connect-apps/#validating-installation-lifecycle-requests
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateJiraAsymmetricJwtToken = async ({
	keyId,
	pathname,
	method,
	connectInstallation: { baseUrl, clientKey },
}: {
	keyId: string;
	pathname: string;
	method: string;
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
 * Generates a server symmetric JWT token.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateJiraServerSymmetricJwtToken = ({
	pathname,
	method,
	query,
	connectInstallation: { clientKey, sharedSecret },
}: {
	method: string;
	pathname: string;
	query?: Record<string, unknown>;
	connectInstallation: {
		clientKey: string;
		sharedSecret: string;
	};
}) => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + Duration.ofMinutes(5).asSeconds,
			iss: clientKey,
			qsh: createQueryStringHash({ method, pathname, query }),
		},
		sharedSecret,
	);
};

/**
 * Generates a context symmetric JWT token.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const generateJiraContextSymmetricJwtToken = ({
	atlassianUserId,
	connectInstallation: { clientKey, sharedSecret },
}: {
	atlassianUserId: string;
	connectInstallation: {
		clientKey: string;
		sharedSecret: string;
	};
}) => {
	const nowInSeconds = Math.floor(Date.now() / 1000);
	return encodeSymmetric(
		{
			iat: nowInSeconds,
			exp: nowInSeconds + Duration.ofMinutes(3).asSeconds,
			iss: clientKey,
			sub: atlassianUserId,
			qsh: 'context-qsh',
		},
		sharedSecret,
	);
};
