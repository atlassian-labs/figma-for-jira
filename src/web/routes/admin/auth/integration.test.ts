import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../../app';
import { getConfig } from '../../../../config';
import {
	generateConnectInstallationCreateParams,
	generateExpiredFigmaOAuth2UserCredentialCreateParams,
	generateFigmaOAuth2UserCredentialCreateParams,
} from '../../../../domain/entities/testing';
import { figmaAuthService } from '../../../../infrastructure/figma';
import {
	generateRefreshOAuth2TokenQueryParams,
	generateRefreshOAuth2TokenResponse,
} from '../../../../infrastructure/figma/figma-client/testing';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../../infrastructure/repositories';
import {
	generateJiraContextSymmetricJwtToken,
	mockFigmaMeEndpoint,
	mockJiraCheckPermissionsEndpoint,
} from '../../../testing';

const FIGMA_OAUTH_API_BASE_URL =
	getConfig().figma.oauth2.authorizationServerBaseUrl;

const FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT = '/api/oauth/refresh';
const CHECK_AUTH_ENDPOINT = '/admin/auth/checkAuth';

describe('/admin/auth', () => {
	describe('/checkAuth', () => {
		const REFRESH_TOKEN = uuidv4();
		const REFRESH_TOKEN_QUERY_PARAMS = generateRefreshOAuth2TokenQueryParams({
			client_id: getConfig().figma.oauth2.clientId,
			client_secret: getConfig().figma.oauth2.clientSecret,
			refresh_token: REFRESH_TOKEN,
		});

		it('should return a response indicating that user is authorized if user is authorized', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			return request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({ authorized: true });
		});

		it('should return a response indicating that user is not authorized if no credentials stored', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});

			return request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({
					authorized: false,
					grant: {
						authorizationEndpoint:
							figmaAuthService.createOAuth2AuthorizationRequest({
								atlassianUserId,
								connectInstallation,
								redirectEndpoint: 'figma/oauth/callback',
							}),
					},
				});
		});

		it('should return a response indicating that user is authorized if credentials were refreshed', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateExpiredFigmaOAuth2UserCredentialCreateParams({
					refreshToken: REFRESH_TOKEN,
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const refreshTokenResponse = generateRefreshOAuth2TokenResponse();
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT)
				.query(REFRESH_TOKEN_QUERY_PARAMS)
				.reply(HttpStatusCode.Ok, refreshTokenResponse);
			mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			await request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({ authorized: true });

			const credentials = await figmaOAuth2UserCredentialsRepository.get(
				atlassianUserId,
				connectInstallation.id,
			);
			expect(credentials?.accessToken).toEqual(
				refreshTokenResponse.access_token,
			);
			expect(credentials?.isExpired()).toBeFalsy();
		});

		it('should return a response indicating that user is not authorized if credentials could not be refreshed', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateExpiredFigmaOAuth2UserCredentialCreateParams({
					refreshToken: REFRESH_TOKEN,
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_REFRESH_TOKEN_ENDPOINT)
				.query(REFRESH_TOKEN_QUERY_PARAMS)
				.reply(HttpStatusCode.InternalServerError);

			return request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({
					authorized: false,
					grant: {
						authorizationEndpoint:
							figmaAuthService.createOAuth2AuthorizationRequest({
								atlassianUserId,
								connectInstallation,
								redirectEndpoint: 'figma/oauth/callback',
							}),
					},
				});
		});

		it('should return a response indicating that user is not authorized if the /me endpoint responds with a 403', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				status: HttpStatusCode.Forbidden,
			});

			return request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({
					authorized: false,
					grant: {
						authorizationEndpoint:
							figmaAuthService.createOAuth2AuthorizationRequest({
								atlassianUserId,
								connectInstallation,
								redirectEndpoint: 'figma/oauth/callback',
							}),
					},
				});
		});

		it('should return unauthorized error if a user is not Jira admin', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				connectInstallation,
				atlassianUserId,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: [],
				},
			});
			mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			return request(app)
				.get(CHECK_AUTH_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Unauthorized);
		});
	});
});
