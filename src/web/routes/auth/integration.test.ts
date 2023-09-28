import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { Duration } from '../../../common/duration';
import { getConfig } from '../../../config';
import type { FigmaOAuth2UserCredentials } from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateConnectUserInfo,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
import { figmaAuthService } from '../../../infrastructure/figma';
import {
	generateGetOAuth2TokenQueryParams,
	generateGetOAuth2TokenResponse,
	generateRefreshOAuth2TokenQueryParams,
	generateRefreshOAuth2TokenResponse,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';

import { FAILURE_PAGE_URL, SUCCESS_PAGE_URL } from './index';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.oauthApiBaseUrl;

const FIGMA_OAUTH_TOKEN_ENDPOINT = '/api/oauth/token';
const FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT = '/api/oauth/refresh';
const FIGMA_ME_ENDPOINT = '/v1/me';
const CHECK_AUTH_ENDPOINT = '/auth/checkAuth';
const AUTH_CALLBACK_ENDPOINT = '/auth/callback';

describe('/auth', () => {
	describe('/checkAuth', () => {
		describe('with valid OAuth credentials stored', () => {
			let validCredentials: FigmaOAuth2UserCredentials;

			beforeEach(async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				validCredentials = await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
			});

			it('should return a response indicating that user is authorized if /me endpoint responds with a non-error response code', () => {
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Ok);

				return request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${validCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ type: '3LO', authorized: true });
			});

			it('should return a response indicating that user is not authorized if the /me endpoint responds with a 403', () => {
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Forbidden);

				return request(app)
					.get(
						`${CHECK_AUTH_ENDPOINT}?userId=${validCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									{
										atlassianUserId: validCredentials.atlassianUserId,
										connectInstallationId:
											validCredentials.connectInstallationId,
									},
									`${getConfig().app.baseUrl}/auth/callback`,
								),
						},
					});
			});
		});

		describe('with expired OAuth credentials stored', () => {
			const refreshToken = uuidv4();
			let expiredCredentials: FigmaOAuth2UserCredentials;
			const refreshTokenQueryParams = generateRefreshOAuth2TokenQueryParams({
				client_id: getConfig().figma.clientId,
				client_secret: getConfig().figma.clientSecret,
				refresh_token: refreshToken,
			});

			beforeEach(async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				expiredCredentials = await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({
						accessToken: 'expired-access-token',
						expiresAt: new Date(
							Date.now() - Duration.ofMinutes(120).asMilliseconds,
						),
						connectInstallationId: connectInstallation.id,
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
						`${CHECK_AUTH_ENDPOINT}?userId=${expiredCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ type: '3LO', authorized: true });

				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					expiredCredentials.atlassianUserId,
					expiredCredentials.connectInstallationId,
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
						`${CHECK_AUTH_ENDPOINT}?userId=${expiredCredentials.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									{
										atlassianUserId: expiredCredentials.atlassianUserId,
										connectInstallationId:
											expiredCredentials.connectInstallationId,
									},
									`${getConfig().app.baseUrl}/auth/callback`,
								),
						},
					});
			});
		});

		describe('without OAuth credentials stored', () => {
			it('should return a response indicating that user is not authorized if no database entry exists', async () => {
				const userId = 'unknown-user-id';
				// TODO: Review whether the endpoint has authorization.
				const connectUserInfo = generateConnectUserInfo({
					atlassianUserId: userId,
				});

				return request(app)
					.get(`${CHECK_AUTH_ENDPOINT}?userId=${userId}`)
					.expect(HttpStatusCode.Ok)
					.expect({
						type: '3LO',
						authorized: false,
						grant: {
							authorizationEndpoint:
								figmaAuthService.buildAuthorizationEndpoint(
									connectUserInfo,
									`${getConfig().app.baseUrl}/auth/callback`,
								),
						},
					});
			});
		});
	});

	describe('/callback', () => {
		const userId = 'authorized-user-id';
		const getTokenQueryParams = generateGetOAuth2TokenQueryParams({
			client_id: getConfig().figma.clientId,
			client_secret: getConfig().figma.clientSecret,
			redirect_uri: `${getConfig().app.baseUrl}${AUTH_CALLBACK_ENDPOINT}`,
		});

		it('should redirect to success page if auth callback to figma succeeds', () => {
			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Ok, generateGetOAuth2TokenResponse());

			return request(app)
				.get(
					`${AUTH_CALLBACK_ENDPOINT}?state=${userId}&code=${getTokenQueryParams.code}`,
				)
				.expect(HttpStatusCode.Found)
				.expect('Location', SUCCESS_PAGE_URL);
		});

		it('should redirect to failure page if auth callback to figma fails', () => {
			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Unauthorized);

			return request(app)
				.get(
					`${AUTH_CALLBACK_ENDPOINT}?state=${userId}&code=${getTokenQueryParams.code}`,
				)
				.expect(HttpStatusCode.Found)
				.expect('Location', FAILURE_PAGE_URL);
		});
	});
});
