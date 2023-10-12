import {
	decodeSymmetric,
	getAlgorithm,
	SymmetricAlgorithm,
} from 'atlassian-jwt';

import { verifyExpClaim } from './jira-jwt-utils';

import { isEnumValueOf } from '../../../common/enumUtils';
import type { ConnectInstallation } from '../../../domain/entities';
import { UnauthorizedError } from '../../../web/middleware/errors';
import type { JSONSchemaTypeWithId } from '../../index';
import { assertSchema, getLogger } from '../../index';
import { connectInstallationRepository } from '../../repositories';

type JiraContextSymmetricJwtClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly qsh: string;
	readonly sub: string;
};

/**
 * https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#claims
 */
const JIRA_CONTEXT_SYMMETRIC_JWT_CLAIMS_SCHEMA: JSONSchemaTypeWithId<JiraContextSymmetricJwtClaims> =
	{
		$id: 'jira-software-connect:jwt-context-symmetric-token-claims',
		type: 'object',
		properties: {
			iss: { type: 'string', minLength: 1 },
			iat: { type: 'integer' },
			exp: { type: 'integer' },
			qsh: { type: 'string', pattern: 'context-qsh' },
			sub: { type: 'string', minLength: 1 },
		},
		required: ['iss', 'iat', 'exp', 'qsh', 'sub'],
	};

/**
 * Verifier for context symmetric JWT tokens.
 *
 * @remarks
 * Context JWT tokens are sent by Connect App UI embed in Jira via extension points.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
export class JiraContextSymmetricJwtTokenVerifier {
	verify = async (
		token: string,
	): Promise<{
		connectInstallation: ConnectInstallation;
		atlassianUserId: string;
	}> => {
		try {
			const tokenSigningAlgorithm = getAlgorithm(token) as unknown;

			if (!isEnumValueOf(SymmetricAlgorithm, tokenSigningAlgorithm)) {
				throw new UnauthorizedError('Unsupported JWT signing algorithm.');
			}

			// Decode a JWT token without verification.
			const unverifiedClaims = decodeSymmetric(
				token,
				'',
				tokenSigningAlgorithm,
				true,
			) as unknown;

			assertSchema(unverifiedClaims, JIRA_CONTEXT_SYMMETRIC_JWT_CLAIMS_SCHEMA);

			const connectInstallation =
				await connectInstallationRepository.getByClientKey(
					unverifiedClaims.iss,
				);

			const verifiedClaims = decodeSymmetric(
				token,
				connectInstallation.sharedSecret,
				tokenSigningAlgorithm,
			) as unknown;

			assertSchema(verifiedClaims, JIRA_CONTEXT_SYMMETRIC_JWT_CLAIMS_SCHEMA);
			verifyExpClaim(verifiedClaims);

			return {
				connectInstallation,
				atlassianUserId: verifiedClaims.sub,
			};
		} catch (e) {
			getLogger().warn(e, 'Failed to verify the context symmetric JWT token.');

			if (e instanceof UnauthorizedError) throw e;

			throw new UnauthorizedError('Invalid token.');
		}
	};
}

export const jiraContextSymmetricJwtTokenVerifier =
	new JiraContextSymmetricJwtTokenVerifier();
