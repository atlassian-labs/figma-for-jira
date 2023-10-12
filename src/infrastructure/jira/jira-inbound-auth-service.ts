import {
	createQueryStringHash,
	decodeAsymmetric,
	decodeSymmetric,
	getAlgorithm,
	getKeyId,
	SymmetricAlgorithm,
} from 'atlassian-jwt';
import { AsymmetricAlgorithm } from 'atlassian-jwt/dist/lib/jwt';
import axios from 'axios';

import { Duration } from '../../common/duration';
import { isEnumValueOf } from '../../common/enumUtils';
import { ensureString } from '../../common/stringUtils';
import { getConfig } from '../../config';
import { UnauthorizedError } from '../../web/middleware/errors';
import type { JSONSchemaTypeWithId } from '../index';
import { assertSchema, getLogger } from '../index';
import { connectInstallationRepository } from '../repositories';

type JiraJwtClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly qsh: string;
	readonly sub?: string;
	readonly aud?: string | string[];
};

const TOKEN_EXPIRATION_LEEWAY = Duration.ofSeconds(3);
const CONTEXT_TOKEN_QSH = 'context-qsh';
const CONNECT_JWT_CLAIMS_SCHEMA = {
	$id: 'jira-software-connect:jwt-token-claims',
	type: 'object',
	properties: {
		iss: { type: 'string', minLength: 1 },
		iat: { type: 'integer' },
		exp: { type: 'integer' },
		qsh: { type: 'string', minLength: 1 },
		sub: {
			type: 'string',
			minLength: 1,
			nullable: true,
		},
		aud: {
			type: 'array',
			items: { type: 'string' },
			nullable: true,
		},
	},
	required: ['iss', 'iat', 'exp', 'qsh'],
	// Add a type assertion as workaround for the type inference limitations for the field with multiple types.
	// See for more detail: https://github.com/ajv-validator/ajv/issues/2081
} as JSONSchemaTypeWithId<
	Omit<JiraJwtClaims, 'aud'>
> as JSONSchemaTypeWithId<JiraJwtClaims>;

export class JiraInboundAuthService {
	/**
	 * Verifies an asymmetric JWT token.
	 *
	 * @remarks
	 * Asymmetric JWT tokens are sent with lifecycle callback events by Jira server.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
	 */
	verifyAsymmetricJwtToken = async (
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

			assertSchema(unverifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);

			const keyId = ensureString(getKeyId(token));
			const publicKey = await this.queryAtlassianConnectPublicKey(keyId);

			// Decode the JWT token with verification.
			const verifiedClaims = decodeAsymmetric(
				token,
				publicKey,
				tokenSigningAlgorithm,
			) as unknown;

			assertSchema(verifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);
			this.verifyQshClaimBoundToUrl(verifiedClaims, request);
			this.verifyExpClaim(verifiedClaims);
			this.verifyAudClaimContainsBaseUrl(
				verifiedClaims,
				getConfig().app.baseUrl,
			);
		} catch (e: unknown) {
			getLogger().warn(e, 'Failed to verify the asymmetric JWT token.');

			if (e instanceof UnauthorizedError) throw e;

			throw new UnauthorizedError('Authentication failed.');
		}
	};

	/**
	 * Verifies a context symmetric JWT token.
	 *
	 * @remarks
	 * Context JWT tokens are sent by Connect App UI embed in Jira via extension points.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
	 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
	 */
	verifyContextSymmetricJwtToken = async (token: string) => {
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

			assertSchema(unverifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);

			const connectInstallation =
				await connectInstallationRepository.getByClientKey(
					unverifiedClaims.iss,
				);

			const verifiedClaims = decodeSymmetric(
				token,
				connectInstallation.sharedSecret,
				tokenSigningAlgorithm,
			) as unknown;

			assertSchema(verifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);
			this.verifyQshEqualTo(verifiedClaims, CONTEXT_TOKEN_QSH);
			this.verifyExpClaim(verifiedClaims);

			return {
				connectInstallation,
				atlassianUserId: verifiedClaims.sub!,
			};
		} catch (e) {
			getLogger().warn(e, 'Failed to verify the context symmetric JWT token.');

			if (e instanceof UnauthorizedError) throw e;

			throw new UnauthorizedError('Authentication failed.');
		}
	};

	/**
	 * Verifies a symmetric JWT token.
	 *
	 * @remarks
	 * An iframe or server-to-server symmetric JWT tokens are sent by Jira server.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
	 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
	 */
	verifyServerSymmetricJwtToken = async (
		token: string,
		request: {
			method: string;
			pathname?: string;
			query?: Record<string, unknown>;
		},
	) => {
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

			assertSchema(unverifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);

			const connectInstallation =
				await connectInstallationRepository.getByClientKey(
					unverifiedClaims.iss,
				);

			const verifiedClaims = decodeSymmetric(
				token,
				connectInstallation.sharedSecret,
				tokenSigningAlgorithm,
			) as unknown;

			assertSchema(verifiedClaims, CONNECT_JWT_CLAIMS_SCHEMA);
			this.verifyQshClaimBoundToUrl(verifiedClaims, request);
			this.verifyExpClaim(verifiedClaims);

			return {
				connectInstallation,
			};
		} catch (e) {
			getLogger().warn(e, 'Failed to verify the server symmetric JWT token.');

			if (e instanceof UnauthorizedError) throw e;

			throw new UnauthorizedError('Authentication failed.');
		}
	};

	/**
	 * Returns the public key for asymmetric JWT token validation.
	 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#verifying-a-asymmetric-jwt-token-for-install-callbacks
	 */
	private queryAtlassianConnectPublicKey = async (
		keyId: string,
	): Promise<string> => {
		try {
			const response = await axios.get<string>(
				`${getConfig().jira.connectKeyServerUrl}/${keyId}`,
			);
			return response.data;
		} catch (e: unknown) {
			throw new UnauthorizedError(
				`Unable to get public key for keyId ${keyId}`,
			);
		}
	};

	/**
	 * Verifies the `qsh` claim to ensure that the query has not been tampered by creating a query hash and comparing
	 * 	it against the `qsh` claim.
	 */
	private verifyQshClaimBoundToUrl = (
		{ qsh }: JiraJwtClaims,
		request: {
			method: string;
			pathname?: string;
			query?: Record<string, unknown>;
		},
	) => {
		if (qsh !== createQueryStringHash(request, false)) {
			throw new UnauthorizedError('The token contains an invalid `qsh` claim.');
		}
	};

	private verifyQshEqualTo = ({ qsh }: JiraJwtClaims, value: string) => {
		if (qsh !== value) {
			throw new UnauthorizedError('The token contains an invalid `qsh` claim.');
		}
	};

	/**
	 * Verifies the `exp` claim to ensure that the token is still within expiration.
	 * It gives a several second leeway in case of time drift.
	 */
	private verifyExpClaim = ({ exp }: JiraJwtClaims) => {
		const nowInSeconds = Date.now() / 1000;

		if (nowInSeconds > exp + TOKEN_EXPIRATION_LEEWAY.asSeconds) {
			throw new UnauthorizedError('The token is expired.');
		}
	};

	private verifyAudClaimContainsBaseUrl = (
		{ aud }: JiraJwtClaims,
		baseUrl: string,
	) => {
		if (!aud?.[0]?.includes(baseUrl)) {
			throw new UnauthorizedError(
				'The token does not contain or contain an invalid `aud` claim.',
			);
		}
	};
}

export const jiraInboundAuthService = new JiraInboundAuthService();
