import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';

import app from '../../../app';
import { Duration } from '../../../common/duration';
import { getConfig } from '../../../config';
import { generateFigmaUserCredentialsCreateParams } from '../../../domain/entities/testing';
import {
	generateGetOAuth2TokenQueryParams,
	generateGetOAuth2TokenResponse,
	generateRefreshOAuth2TokenQueryParams,
	generateRefreshOAuth2TokenResponse,
} from '../../../infrastructure/figma/testing';
import { figmaOAuth2UserCredentialsRepository } from '../../../infrastructure/repositories';

import { FAILURE_PAGE_URL, SUCCESS_PAGE_URL } from './index';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.oauthApiBaseUrl;

const FIGMA_OAUTH_TOKEN_ENDPOINT = '/api/oauth/token';
const FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT = '/api/oauth/refresh';
const FIGMA_ME_ENDPOINT = '/v1/me';
const CHECK_3LO_ENDPOINT = '/auth/check3LO';
const AUTH_CALLBACK_ENDPOINT = '/auth/callback';

const cleanupToken = async (atlassianUserId: string) => {
	await figmaOAuth2UserCredentialsRepository
		.delete(atlassianUserId)
		.catch(console.error);
};

describe('/auth', () => {
	describe('/check3LO', () => {
		describe('with valid OAuth credentials stored', () => {
			const validCredentialsParams = generateFigmaUserCredentialsCreateParams();

			beforeEach(async () => {
				await figmaOAuth2UserCredentialsRepository.upsert(
					validCredentialsParams,
				);
			});

			afterEach(async () => {
				await cleanupToken(validCredentialsParams.atlassianUserId);
			});

			it('should respond with "authorized: true" if the /me endpoint responds with a non-error response code', () => {
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Ok);

				return request(app)
					.get(
						`${CHECK_3LO_ENDPOINT}?userId=${validCredentialsParams.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ authorized: true });
			});

			it('should respond with "authorized: false" if the /me endpoint responds with a 403', () => {
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Forbidden);

				return request(app)
					.get(
						`${CHECK_3LO_ENDPOINT}?userId=${validCredentialsParams.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ authorized: false });
			});
		});

		describe('with expired OAuth credentials stored', () => {
			const expiredCredentialsParams = generateFigmaUserCredentialsCreateParams(
				{
					accessToken: 'expired-access-token',
					expiresAt: new Date(
						Date.now() - Duration.ofMinutes(120).asMilliseconds,
					),
				},
			);
			const refreshTokenQueryParams = generateRefreshOAuth2TokenQueryParams({
				client_id: getConfig().figma.clientId,
				client_secret: getConfig().figma.clientSecret,
				refresh_token: expiredCredentialsParams.refreshToken,
			});

			beforeEach(async () => {
				await figmaOAuth2UserCredentialsRepository.upsert(
					expiredCredentialsParams,
				);
			});

			afterEach(async () => {
				await cleanupToken(expiredCredentialsParams.atlassianUserId);
			});

			it('should respond with "authorized: true" if the /me endpoint responds with a non-error response code', async () => {
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
						`${CHECK_3LO_ENDPOINT}?userId=${expiredCredentialsParams.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ authorized: true });

				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					expiredCredentialsParams.atlassianUserId,
				);
				expect(credentials?.accessToken).toEqual(
					refreshTokenResponse.access_token,
				);
				expect(credentials?.isExpired()).toBeFalsy();
			});

			it('should respond with "authorized: false" if the credentials could not be refreshed', () => {
				nock(FIGMA_OAUTH_API_BASE_URL)
					.post(FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT)
					.query(refreshTokenQueryParams)
					.reply(HttpStatusCode.InternalServerError);
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Ok);

				return request(app)
					.get(
						`${CHECK_3LO_ENDPOINT}?userId=${expiredCredentialsParams.atlassianUserId}`,
					)
					.expect(HttpStatusCode.Ok)
					.expect({ authorized: false });
			});
		});

		describe('without OAuth credentials stored', () => {
			it('should respond with "authorized: false" if no database entry exists', async () => {
				const userId = 'unknown-user-id';
				nock(FIGMA_API_BASE_URL)
					.get(FIGMA_ME_ENDPOINT)
					.reply(HttpStatusCode.Forbidden);

				return request(app)
					.get(`/auth/check3LO?userId=${userId}`)
					.expect(HttpStatusCode.Ok)
					.expect({ authorized: false });
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
				.expect('Location', SUCCESS_PAGE_URL)
				.then(async () => await cleanupToken(userId));
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
