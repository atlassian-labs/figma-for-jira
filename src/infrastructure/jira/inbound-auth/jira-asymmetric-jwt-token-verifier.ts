import { decodeAsymmetric, getAlgorithm, getKeyId } from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';

import { connectKeyServerClient } from './connect-key-server-client';
import {
	verifyAudClaimIncludesBaseUrl,
	verifyExpClaim,
	verifyQshClaimBoundToUrl,
} from './jira-jwt-utils';

import { isEnumValueOf } from '../../../common/enumUtils';
import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';
import { assertSchema } from '../../../common/schema-validation';
import { ensureString } from '../../../common/string-utils';
import { getConfig } from '../../../config';

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
					minLength: 1,
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
		const tokenSigningAlgorithm = getAlgorithm(token) as unknown;

		if (!isEnumValueOf(AsymmetricAlgorithm, tokenSigningAlgorithm)) {
			throw new Error('Unsupported JWT signing algorithm.');
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
		verifyQshClaimBoundToUrl(verifiedClaims, request);
		verifyExpClaim(verifiedClaims);
		verifyAudClaimIncludesBaseUrl(verifiedClaims, getConfig().app.baseUrl);
	};
}

export const jiraAsymmetricJwtTokenVerifier =
	new JiraAsymmetricJwtTokenVerifier();
