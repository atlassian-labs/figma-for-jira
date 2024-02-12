import {
	decodeSymmetric,
	getAlgorithm,
	SymmetricAlgorithm,
} from 'atlassian-jwt';

import { verifyExpClaim, verifyQshClaimBoundToUrl } from './jira-jwt-utils';

import { isEnumValueOf } from '../../../common/enumUtils';
import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';
import { assertSchema } from '../../../common/schema-validation';
import type { ConnectInstallation } from '../../../domain/entities';
import { connectInstallationRepository } from '../../repositories';

type JiraIframeOrServerToServerSymmetricJwtClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly qsh: string;
	readonly sub?: string;
};

/**
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#claims
 */
const JIRA_SERVER_SYMMETRIC_JWT_CLAIMS_SCHEMA: JSONSchemaTypeWithId<JiraIframeOrServerToServerSymmetricJwtClaims> =
	{
		$id: 'jira-software-connect:jwt-server-symmetric-token-claims',
		type: 'object',
		properties: {
			iss: { type: 'string', minLength: 1 },
			iat: { type: 'integer' },
			exp: { type: 'integer' },
			qsh: { type: 'string', minLength: 1 },
			sub: { type: 'string', nullable: true },
		},
		required: ['iss', 'iat', 'exp', 'qsh'],
	};

/**
 * Verifier for iframe or server-to-server symmetric JWT tokens.
 *
 * @remarks
 * An iframe or server-to-server symmetric JWT tokens are sent by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 *
 * @throws {Error} The token is invalid or cannot be verified.
 */
export class JiraIframeOrServerToServerSymmetricJwtTokenVerifier {
	verify = async (
		token: string,
		request: {
			method: string;
			pathname?: string;
			query?: Record<string, unknown>;
		},
	): Promise<{
		connectInstallation: ConnectInstallation;
		atlassianUserId?: string;
	}> => {
		const tokenSigningAlgorithm = getAlgorithm(token) as unknown;

		if (!isEnumValueOf(SymmetricAlgorithm, tokenSigningAlgorithm)) {
			throw new Error('Unsupported JWT signing algorithm.');
		}

		// Decode a JWT token without verification.
		const unverifiedClaims = decodeSymmetric(
			token,
			'',
			tokenSigningAlgorithm,
			true,
		) as unknown;

		assertSchema(unverifiedClaims, JIRA_SERVER_SYMMETRIC_JWT_CLAIMS_SCHEMA);

		const connectInstallation =
			await connectInstallationRepository.getByClientKey(unverifiedClaims.iss);

		const verifiedClaims = decodeSymmetric(
			token,
			connectInstallation.sharedSecret,
			tokenSigningAlgorithm,
		) as unknown;

		assertSchema(verifiedClaims, JIRA_SERVER_SYMMETRIC_JWT_CLAIMS_SCHEMA);
		verifyQshClaimBoundToUrl(verifiedClaims, request);
		verifyExpClaim(verifiedClaims);

		return {
			connectInstallation,
			atlassianUserId: verifiedClaims.sub,
		};
	};
}

export const jiraIframeOrServerToServerSymmetricJwtTokenVerifier =
	new JiraIframeOrServerToServerSymmetricJwtTokenVerifier();
