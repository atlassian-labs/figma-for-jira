import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../../app';
import { buildAppUrl, getConfig } from '../../../../config';
import type {
	ConnectInstallation,
	FigmaOAuth2UserCredentials,
	FigmaTeamSummary,
} from '../../../../domain/entities';
import { FigmaTeamAuthStatus } from '../../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateFigmaTeamCreateParams,
	generateFigmaTeamSummary,
} from '../../../../domain/entities/testing';
import { figmaClient } from '../../../../infrastructure/figma/figma-client';
import {
	generateCreateWebhookResponse,
	generateGetTeamProjectsResponse,
} from '../../../../infrastructure/figma/figma-client/testing';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../../infrastructure/repositories';
import {
	generateJiraContextSymmetricJwtToken,
	mockFigmaCreateWebhookEndpoint,
	mockFigmaDeleteWebhookEndpoint,
	mockFigmaGetTeamProjectsEndpoint,
	mockJiraCheckPermissionsEndpoint,
	mockJiraSetAppPropertyEndpoint,
} from '../../../testing';

const figmaTeamSummaryComparer = (a: FigmaTeamSummary, b: FigmaTeamSummary) =>
	a.teamId.localeCompare(b.teamId);

describe('/admin/teams', () => {
	describe('GET /', () => {
		let targetConnectInstallation: ConnectInstallation;
		let otherConnectInstallation: ConnectInstallation;
		let figmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;

		beforeEach(async () => {
			targetConnectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			otherConnectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			figmaOAuth2UserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				);
		});

		it('should return a list teams for the given connect installation', async () => {
			const [team1, team2] = await Promise.all([
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: otherConnectInstallation.id,
					}),
				),
			]);
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation: targetConnectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: targetConnectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});

			const response = await request(app)
				.get(buildAppUrl('admin/teams').pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok);

			expect(
				(response.body as FigmaTeamSummary[]).sort(figmaTeamSummaryComparer),
			).toEqual(
				[team1, team2]
					.map((team) => generateFigmaTeamSummary(team))
					.sort(figmaTeamSummaryComparer),
			);
		});

		it('should return an empty list if there are no teams connected for the given connect installation', async () => {
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation: targetConnectInstallation,
			});

			await Promise.all([
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: otherConnectInstallation.id,
					}),
				),
				figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: otherConnectInstallation.id,
					}),
				),
			]);

			mockJiraCheckPermissionsEndpoint({
				baseUrl: targetConnectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});

			const response = await request(app)
				.get(buildAppUrl('admin/teams').pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok);

			expect(response.body).toEqual([]);
		});

		it('should return unauthorized error if a user is not Jira admin', async () => {
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation: targetConnectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: targetConnectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: [],
				},
			});

			await request(app)
				.get(buildAppUrl('admin/teams').pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Unauthorized);
		});
	});

	describe('POST /:teamId/connect', () => {
		let connectInstallation: ConnectInstallation;
		let figmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;

		beforeEach(async () => {
			connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			figmaOAuth2UserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
		});

		it('should create a webhook and FigmaTeam record', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();
			const webhookId = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaGetTeamProjectsEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				teamId,
				response: generateGetTeamProjectsResponse({ name: teamName }),
			});
			mockFigmaCreateWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: {
					event_type: 'FILE_UPDATE',
					team_id: teamId,
					endpoint: new URL(
						`figma/webhook`,
						getConfig().app.baseUrl,
					).toString(),
					passcode: /.+/i,
					description: /.+/i,
				},
				response: generateCreateWebhookResponse({
					id: webhookId,
					teamId,
				}),
			});
			mockJiraSetAppPropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				appKey: connectInstallation.key,
				propertyKey: 'is-configured',
				request: { isConfigured: `CONFIGURED` },
			});

			await request(app)
				.post(buildAppUrl(`admin/teams/${teamId}/connect`).pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok)
				.expect({
					teamId,
					teamName,
					authStatus: FigmaTeamAuthStatus.OK,
				});

			const figmaTeam = await figmaTeamRepository.getAll();
			expect(figmaTeam[0]).toEqual({
				id: expect.anything(),
				webhookId,
				webhookPasscode: expect.anything(),
				teamId,
				teamName,
				figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				authStatus: FigmaTeamAuthStatus.OK,
				connectInstallationId: connectInstallation.id,
			});
		});

		it('should return HTTP 500 and not create a FigmaTeam when creating the webhook fails', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaGetTeamProjectsEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				teamId,
				response: generateGetTeamProjectsResponse({ name: teamName }),
			});
			mockFigmaCreateWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				status: HttpStatusCode.InternalServerError,
			});

			await request(app)
				.post(buildAppUrl(`admin/teams/${teamId}/connect`).pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.InternalServerError);

			expect(await figmaTeamRepository.getAll()).toStrictEqual([]);
		});

		it('should return HTTP 402 if a user is not on Figma paid plan', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaGetTeamProjectsEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				teamId,
				response: generateGetTeamProjectsResponse({ name: teamName }),
			});
			mockFigmaCreateWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				status: HttpStatusCode.BadRequest,
				response: {
					message: 'Access Denied',
				},
			});

			await request(app)
				.post(buildAppUrl(`admin/teams/${teamId}/connect`).pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.PaymentRequired);
		});

		it('should return HTTP 403 if a user is not Jira admin', async () => {
			const teamId = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: figmaOAuth2UserCredentials.atlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: [],
				},
			});

			await request(app)
				.post(buildAppUrl(`admin/teams/${teamId}/connect`).pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Unauthorized);
		});
	});

	describe('DELETE /:teamId/disconnect', () => {
		let connectInstallation: ConnectInstallation;
		let figmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;

		beforeEach(async () => {
			connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			figmaOAuth2UserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
		});

		it('should delete the webhook and FigmaTeam record', async () => {
			jest.spyOn(figmaClient, 'deleteWebhook');
			const nonFigmaTeamAdminAtlassianUserId = uuidv4();
			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: nonFigmaTeamAdminAtlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: nonFigmaTeamAdminAtlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: figmaTeam.webhookId,
				accessToken: figmaOAuth2UserCredentials.accessToken,
				status: HttpStatusCode.Ok,
			});
			mockJiraSetAppPropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				appKey: connectInstallation.key,
				propertyKey: 'is-configured',
				request: { isConfigured: `NOT_CONFIGURED` },
			});

			await request(app)
				.delete(
					buildAppUrl(`admin/teams/${figmaTeam.teamId}/disconnect`).pathname,
				)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok);

			expect(
				await figmaTeamRepository.findByWebhookId(figmaTeam.webhookId),
			).toBeNull();
			expect(figmaClient.deleteWebhook).toHaveBeenCalledWith(
				figmaTeam.webhookId,
				figmaOAuth2UserCredentials.accessToken,
			);
		});

		it('should return a 200 and delete the FigmaTeam when webhook is not found', async () => {
			const nonFigmaTeamAdminAtlassianUserId = uuidv4();
			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: nonFigmaTeamAdminAtlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: nonFigmaTeamAdminAtlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: figmaTeam.webhookId,
				accessToken: figmaOAuth2UserCredentials.accessToken,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetAppPropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				appKey: connectInstallation.key,
				propertyKey: 'is-configured',
				request: { isConfigured: `NOT_CONFIGURED` },
			});

			await request(app)
				.delete(
					buildAppUrl(`admin/teams/${figmaTeam.teamId}/disconnect`).pathname,
				)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Ok);

			expect(
				await figmaTeamRepository.findByWebhookId(figmaTeam.webhookId),
			).toBeNull();
		});

		it('should return a 200 and delete the FigmaTeam when deleting the webhook fails', async () => {
			const nonFigmaTeamAdminAtlassianUserId = uuidv4();
			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				}),
			);
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: nonFigmaTeamAdminAtlassianUserId,
				connectInstallation,
			});

			mockJiraCheckPermissionsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: {
					accountId: nonFigmaTeamAdminAtlassianUserId,
					globalPermissions: ['ADMINISTER'],
				},
				response: {
					globalPermissions: ['ADMINISTER'],
				},
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: figmaTeam.webhookId,
				accessToken: figmaOAuth2UserCredentials.accessToken,
				status: HttpStatusCode.InternalServerError,
			});

			await request(app)
				.delete(
					buildAppUrl(`admin/teams/${figmaTeam.teamId}/disconnect`).pathname,
				)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.InternalServerError);

			expect(
				await figmaTeamRepository.findByWebhookId(figmaTeam.webhookId),
			).toStrictEqual(figmaTeam);
		});

		it('should return unauthorized error if a user is not Jira admin', async () => {
			jest.spyOn(figmaClient, 'deleteWebhook');
			const atlassianUserId = uuidv4();
			const figmaTeamId = uuidv4();
			const jwt = generateJiraContextSymmetricJwtToken({
				atlassianUserId: atlassianUserId,
				connectInstallation,
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

			await request(app)
				.delete(buildAppUrl(`admin/teams/${figmaTeamId}/disconnect`).pathname)
				.set('Authorization', `JWT ${jwt}`)
				.expect(HttpStatusCode.Unauthorized);
		});
	});
});
