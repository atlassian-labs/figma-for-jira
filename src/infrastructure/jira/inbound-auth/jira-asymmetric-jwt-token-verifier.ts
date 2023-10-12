import {
	createQueryStringHash,
	decodeAsymmetric,
	getAlgorithm,
	getKeyId,
} from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';

import { connectKeyServerClient } from './connect-key-server-client';

import { Duration } from '../../../common/duration';
import { isEnumValueOf } from '../../../common/enumUtils';
import { ensureString } from '../../../common/stringUtils';
import { getConfig } from '../../../config';
import { UnauthorizedError } from '../../../web/middleware/errors';
import type { JSONSchemaTypeWithId } from '../../index';
import { assertSchema, getLogger } from '../../index';

type JiraAsymmetricJwtClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly qsh: string;
	readonly aud: string | string[];
};

/**
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#claims
 */
const JIRA_ASYMMETRIC_JWT_CLAIMS_SCHEMA = {
	$id: 'jira-software-connect:jwt-asymmetric-token-claims',
	type: 'object',
	properties: {
		iss: { type: 'string', minLength: 1 },
		iat: { type: 'integer' },
		exp: { type: 'integer' },
		qsh: { type: 'string', minLength: 1 },
		aud: {
			oneOf: [
				{
					type: 'string',
					nullable: true,
				},
				{
					type: 'array',
					items: { type: 'string' },
				},
			],
		},
	},
	required: ['iss', 'iat', 'exp', 'qsh'],
	// Add a type assertion as workaround for the type inference limitations for the field with multiple types (e.g., `aud`).
	// See for more detail: https://github.com/ajv-validator/ajv/issues/2081
} as JSONSchemaTypeWithId<
	Omit<JiraAsymmetricJwtClaims, 'aud'>
> as JSONSchemaTypeWithId<JiraAsymmetricJwtClaims>;

const TOKEN_EXPIRATION_LEEWAY = Duration.ofSeconds(3);

/**
 * Verifier for asymmetric JWT tokens.
 *
 * @remarks
 * Asymmetric JWT tokens are sent with lifecycle callback events by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export class JiraAsymmetricJwtTokenVerifier {
	verify = async (
		token: string,
		request: {
			method: string;
			pathname?: string;
			query?: Record<string, unknown>;
		},
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

			assertSchema(unverifiedClaims, JIRA_ASYMMETRIC_JWT_CLAIMS_SCHEMA);

			const keyId = ensureString(getKeyId(token));
			const publicKey =
				await connectKeyServerClient.getAtlassianConnectPublicKey(keyId);

			// Decode the JWT token with verification.
			const verifiedClaims = decodeAsymmetric(
				token,
				publicKey,
				tokenSigningAlgorithm,
			) as unknown;

			assertSchema(verifiedClaims, JIRA_ASYMMETRIC_JWT_CLAIMS_SCHEMA);

			if (verifiedClaims.qsh !== createQueryStringHash(request, false)) {
				throw new UnauthorizedError(
					'The token contains an invalid `qsh` claim.',
				);
			}

			if (
				Date.now() / 1000 >
				verifiedClaims.exp + TOKEN_EXPIRATION_LEEWAY.asSeconds
			) {
				throw new UnauthorizedError('The token is expired.');
			}

			if (!verifiedClaims.aud[0]?.includes(getConfig().app.baseUrl)) {
				throw new UnauthorizedError(
					'The token does not contain or contain an invalid `aud` claim.',
				);
			}
		} catch (e: unknown) {
			getLogger().warn(e, 'Failed to verify the asymmetric JWT token.');

			if (e instanceof UnauthorizedError) throw e;

			throw new UnauthorizedError('Invalid token.');
		}
	};
}

export const jiraAsymmetricJwtTokenVerifier =
	new JiraAsymmetricJwtTokenVerifier();
