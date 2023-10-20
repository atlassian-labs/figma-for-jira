import {
	decodeSymmetric,
	encodeSymmetric,
	SymmetricAlgorithm,
} from 'atlassian-jwt';

import { figmaClient } from './figma-client';

import { Duration } from '../../common/duration';
import { ensureString } from '../../common/stringUtils';
import { getConfig } from '../../config';
import type {
	ConnectInstallation,
	ConnectUserInfo,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import type { JSONSchemaTypeWithId } from '../ajv';
import { assertSchema } from '../ajv';
import { figmaOAuth2UserCredentialsRepository } from '../repositories';

type FigmaOAuth2StateJwtClaims = {
	readonly iss: string;
	readonly iat: number;
	readonly exp: number;
	readonly sub: string;
	readonly aud: string[];
};

const FIGMA_OAUTH2_STATE_JWT_CLAIMS_SCHEMA: JSONSchemaTypeWithId<FigmaOAuth2StateJwtClaims> =
	{
		$id: 'figma-for-jira:oauth2-state-jwt-token-claims',
		type: 'object',
		properties: {
			iss: { type: 'string', minLength: 1 },
			iat: { type: 'integer' },
			exp: { type: 'integer' },
			sub: { type: 'string', minLength: 1 },
			aud: {
				type: 'array',
				items: { type: 'string' },
			},
		},
		required: ['iss', 'iat', 'exp', 'sub', 'aud'],
	};
const FIGMA_OAUTH2_STATE_JWT_TOKEN_EXPIRATION_LEEWAY = Duration.ofSeconds(3);

export class FigmaAuthService {
	/**
	 * Exchanges the given code on OAuth 2.0 token and stores the credentials for the future usage.
	 */
	createCredentials = async (
		code: string,
		user: ConnectUserInfo,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.getOAuth2Token(code);

		return await figmaOAuth2UserCredentialsRepository.upsert({
			atlassianUserId: user.atlassianUserId,
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresAt: this.createExpiryDate(response.expires_in),
			connectInstallationId: user.connectInstallationId,
		});
	};

	/**
	 * Returns OAuth 2.0 credentials for the given user if he/she completed OAuth 2.0 flow; otherwise -- `null`.
	 *
	 * The method refreshes access token when required, so the caller does not need to handle token expiration.
	 */
	getCredentials = async (
		user: ConnectUserInfo,
	): Promise<FigmaOAuth2UserCredentials> => {
		let credentials: FigmaOAuth2UserCredentials;
		try {
			credentials = await figmaOAuth2UserCredentialsRepository.get(
				user.atlassianUserId,
				user.connectInstallationId,
			);
		} catch (e: unknown) {
			throw new NoFigmaCredentialsError(
				`No credential available for user ${user.atlassianUserId} within Connect installation ${user.connectInstallationId}.`,
			);
		}

		if (credentials.isExpired()) {
			try {
				credentials = await this.refreshCredentials(credentials);
			} catch (e: unknown) {
				throw new RefreshFigmaCredentialsError(
					`Failed to refresh credentials for user ${user.atlassianUserId} within Connect installation ${user.connectInstallationId}.`,
				);
			}
		}
		return credentials;
	};

	/**
	 * Returns an OAuth 2.0 authorization request for the given user.
	 *
	 * @remarks
	 * The authorization request represents the URL of Figma's authorization endpoint.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	createOAuth2AuthorizationRequest = (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
		redirectUri: string,
	): string => {
		const authorizationEndpoint = new URL(
			'/oauth',
			getConfig().figma.oauth2.authorizationServerBaseUrl,
		);

		const nowInSeconds = Math.floor(Date.now() / 1000);

		const state = encodeSymmetric(
			{
				iat: nowInSeconds,
				exp: nowInSeconds + Duration.ofMinutes(5).asSeconds,
				iss: connectInstallation.clientKey,
				sub: atlassianUserId,
				aud: [getConfig().app.baseUrl],
			},
			getConfig().figma.oauth2.stateSecretKey,
			SymmetricAlgorithm.HS256,
		);

		authorizationEndpoint.search = new URLSearchParams({
			client_id: getConfig().figma.oauth2.clientId,
			redirect_uri: redirectUri,
			scope: getConfig().figma.oauth2.scope,
			state,
			response_type: 'code',
		}).toString();

		return authorizationEndpoint.toString();
	};

	/**
	 * Verifies the OAuth 2.0 authorization response and returns the information about the user,
	 * initiated the flow.
	 *
	 * @remarks
	 * A value of the `state` query parameter bypassed by the authorization server through OAuth 2.0 flow.
	 * 	 This is the same value, which was created by {@link createOAuth2AuthorizationRequest}.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	verifyOAuth2AuthorizationResponseState = (
		state: unknown,
	): { atlassianUserId: string; connectClientKey: string } => {
		const encodedState = ensureString(state);

		const claims = decodeSymmetric(
			encodedState,
			getConfig().figma.oauth2.stateSecretKey,
			SymmetricAlgorithm.HS256,
		) as unknown;

		assertSchema(claims, FIGMA_OAUTH2_STATE_JWT_CLAIMS_SCHEMA);

		const nowInSeconds = Date.now() / 1000;

		if (
			nowInSeconds >=
			claims.exp + FIGMA_OAUTH2_STATE_JWT_TOKEN_EXPIRATION_LEEWAY.asSeconds
		) {
			throw new Error('The token is expired.');
		}

		if (claims.aud[0] !== getConfig().app.baseUrl) {
			throw new Error();
		}

		return {
			atlassianUserId: claims.sub,
			connectClientKey: claims.iss,
		};
	};

	private refreshCredentials = async (
		credentials: FigmaOAuth2UserCredentials,
	): Promise<FigmaOAuth2UserCredentials> => {
		const response = await figmaClient.refreshOAuth2Token(
			credentials.refreshToken,
		);

		return figmaOAuth2UserCredentialsRepository.upsert({
			atlassianUserId: credentials.atlassianUserId,
			accessToken: response.access_token,
			refreshToken: credentials.refreshToken,
			expiresAt: this.createExpiryDate(response.expires_in),
			connectInstallationId: credentials.connectInstallationId,
		});
	};

	private createExpiryDate(expiresInSeconds: number): Date {
		return new Date(Date.now() + expiresInSeconds * 1000);
	}
}

export class NoFigmaCredentialsError extends Error {}

export class RefreshFigmaCredentialsError extends Error {}

export const figmaAuthService = new FigmaAuthService();
