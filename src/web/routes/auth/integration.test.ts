import nock from 'nock';
import request from 'supertest';

import {
	mockAuthCode,
	mockAuthQueryParams,
	mockFigmaAuthResponse,
	mockFigmaUserCredentialsCreatePayload,
	mockUserId,
} from './mocks';

import app from '../../../app';
import { getConfig } from '../../../config';
import { getPrismaClient } from '../../../infrastructure/repositories/prisma-client';

import { FAILURE_PAGE_URL, SUCCESS_PAGE_URL } from './index';

const prismaClient = getPrismaClient();

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.oauthApiBaseUrl;

const FIGMA_OAUTH_TOKEN_ENDPOINT = '/api/oauth/token';
const FIGMA_ME_ENDPOINT = '/v1/me';
const CHECK_3LO_ENDPOINT = '/auth/check3LO';
const AUTH_CALLBACK_ENDPOINT = '/auth/callback';

describe('/check3LO', () => {
	describe('with valid database entry', () => {
		beforeEach(async () => {
			await prismaClient.figmaOAuth2UserCredentials.create({
				data: mockFigmaUserCredentialsCreatePayload,
			});
		});
		afterEach(async () => {
			await prismaClient.figmaOAuth2UserCredentials.deleteMany();
		});

		it('should respond with "authorized: true" if the /me endpoint responds with a non-error response code', () => {
			nock(FIGMA_API_BASE_URL).get(FIGMA_ME_ENDPOINT).reply(200);

			return request(app)
				.get(`${CHECK_3LO_ENDPOINT}?userId=${mockUserId}`)
				.expect(200)
				.expect({ authorized: true });
		});
		it('should respond with "authorized: false" if the /me endpoint responds with a 403', () => {
			nock(FIGMA_API_BASE_URL).get(FIGMA_ME_ENDPOINT).reply(403);

			return request(app)
				.get(`${CHECK_3LO_ENDPOINT}?userId=${mockUserId}`)
				.expect(200)
				.expect({ authorized: false });
		});
	});
	describe('without database entry', () => {
		it('should respond with "authorized: false" if no database entry exists', () => {
			nock(`${getConfig().figma.apiBaseUrl}`).get('/v1/me').reply(403);

			return request(app)
				.get(`/auth/check3LO?userId=${mockUserId}`)
				.expect(200)
				.expect({ authorized: false });
		});
	});
});

describe('/callback', () => {
	afterEach(async () => {
		await prismaClient.figmaOAuth2UserCredentials.deleteMany();
	});
	it('should redirect to success page if auth callback to figma succeeds', () => {
		nock(FIGMA_OAUTH_API_BASE_URL)
			.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
			.query(mockAuthQueryParams)
			.reply(200, mockFigmaAuthResponse);

		return request(app)
			.get(`${AUTH_CALLBACK_ENDPOINT}?state=${mockUserId}&code=${mockAuthCode}`)
			.expect(302)
			.expect('Location', SUCCESS_PAGE_URL);
	});
	it('should redirect to failure page if auth callback to figma fails', () => {
		nock(FIGMA_OAUTH_API_BASE_URL)
			.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
			.query(mockAuthQueryParams)
			.reply(401);

		return request(app)
			.get(`${AUTH_CALLBACK_ENDPOINT}?state=${mockUserId}&code=${mockAuthCode}`)
			.expect(302)
			.expect('Location', FAILURE_PAGE_URL);
	});
});
