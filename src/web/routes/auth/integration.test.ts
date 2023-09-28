import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { Duration } from '../../../common/duration';
import { getConfig } from '../../../config';
import type { FigmaOAuth2UserCredentials } from '../../../domain/entities';
import { generateFigmaUserCredentialsCreateParams } from '../../../domain/entities/testing';
import { figmaAuthService } from '../../../infrastructure/figma';
import {
	generateRefreshOAuth2TokenQueryParams,
	generateRefreshOAuth2TokenResponse,
} from '../../../infrastructure/figma/figma-client/testing';
import { figmaOAuth2UserCredentialsRepository } from '../../../infrastructure/repositories';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.oauthApiBaseUrl;

const FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT = '/api/oauth/refresh';
const FIGMA_ME_ENDPOINT = '/v1/me';
const CHECK_AUTH_ENDPOINT = '/auth/checkAuth';

describe('/auth', () => {
	describe('/checkAuth', () => {
		describe('with valid OAuth credentials stored', () => {
			it('should return a response indicating that user is authorized if /me endpoint responds with a non-error response code', async () => {
				const figmaOAuth2UserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaUserCredentialsCreateParams(),
					);

				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Ok);

				return request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${figmaOAuth2UserCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ type: '3LO', authorized: true });
			});

			it('should return a response indicating that user is not authorized if the /me endpoint responds with a 403', async () => {
				const figmaOAuth2UserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaUserCredentialsCreateParams(),
					);

				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Forbidden);

				return request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${figmaOAuth2UserCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									figmaOAuth2UserCredentials.atlassianUserId,
									`${getConfig().app.baseUrl}/figma/oauth/callback`,
								),
						},
					});
			});
		});

		describe('with expired OAuth credentials stored', () => {
			const refreshToken = uuidv4();
			let expiredFigmaUserCredentials: FigmaOAuth2UserCredentials;

			const refreshTokenQueryParams = generateRefreshOAuth2TokenQueryParams({
				client_id: getConfig().figma.clientId,
				client_secret: getConfig().figma.clientSecret,
				refresh_token: refreshToken,
			});

			beforeEach(async () => {
				expiredFigmaUserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaUserCredentialsCreateParams({
							refreshToken,
							expiresAt: new Date(
								Date.now() - Duration.ofMinutes(120).asMilliseconds,
							),
						}),
					);
			});

			it('should return a response indicating that user is authorized if credentials were refreshed', async () => {
				const refreshTokenResponse = generateRefreshOAuth2TokenResponse();
				nock(FIGMA_OAUTH_API_BASE_URL)
					.post(FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT)
					.query(refreshTokenQueryParams)
					.reply(HttpStatusCode.Ok, refreshTokenResponse);
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Ok);

				await request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${expiredFigmaUserCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ type: '3LO', authorized: true });

				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					expiredFigmaUserCredentials.atlassianUserId,
				);
				expect(credentials?.accessToken).toEqual(
					refreshTokenResponse.access_token,
				);
				expect(credentials?.isExpired()).toBeFalsy();
			});

			it('should return a response indicating that user is not authorized if credentials could not be refreshed', () => {
				nock(FIGMA_OAUTH_API_BASE_URL)
					.post(FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT)
					.query(refreshTokenQueryParams)
					.reply(HttpStatusCode.InternalServerError);

				return request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${expiredFigmaUserCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									expiredFigmaUserCredentials.atlassianUserId,
									`${getConfig().app.baseUrl}/figma/oauth/callback`,
								),
						},
					});
			});
		});

		describe('without OAuth credentials stored', () => {
			it('should return a response indicating that user is not authorized if no database entry exists', async () => {
				const userId = 'unknown-user-id';

				return request(app)
					.get(`${CHECK_AUTH_ENDPOINT}?userId=${userId}`)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									userId,
									`${getConfig().app.baseUrl}/figma/oauth/callback`,
								),
						},
					});
			});
		});
	});
});
