import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import {
	generateFileUpdateWebhookEventRequestBody,
	generatePingWebhookEventRequestBody,
} from './testing';
import type { FigmaWebhookEventRequestBody } from './types';

import app from '../../../app';
import { isNotNullOrUndefined } from '../../../common/predicates';
import { isString } from '../../../common/string-utils';
import { buildAppUrl, getConfig } from '../../../config';
import * as launchDarkly from '../../../config/launch_darkly';
import type {
	AtlassianDesign,
	ConnectInstallation,
	FigmaDesignIdentifier,
	FigmaFileWebhook,
	FigmaOAuth2UserCredentials,
	FigmaTeam,
} from '../../../domain/entities';
import {
	FigmaFileWebhookEventType,
	FigmaTeamAuthStatus,
} from '../../../domain/entities';
import {
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallation,
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaFileWebhook,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateFigmaTeamCreateParams,
} from '../../../domain/entities/testing';
import type {
	GetFileMetaResponse,
	GetFileResponse,
} from '../../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateGetFileMetaResponse,
	generateGetFileResponseWithNodes,
	generateGetOAuth2TokenQueryParams,
	generateGetOAuth2TokenResponse,
	generateGetTeamProjectsResponse,
	generateOAuth2BasicAuthHeader,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from '../../../infrastructure/figma/transformers';
import {
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
} from '../../../infrastructure/jira/jira-client/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaFileWebhookRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';
import { waitForEvent } from '../../../infrastructure/testing';
import {
	mockFigmaGetFileEndpoint,
	mockFigmaGetFileMetaEndpoint,
	mockFigmaGetTeamProjectsEndpoint,
	mockJiraSubmitDesignsEndpoint,
} from '../../testing';
import { generateFigmaOAuth2State } from '../../testing/figma-jwt-token-mocks';

const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.apiBaseUrl;

function generateAtlassianDesignFromDesignIdAndFileResponse(
	designId: FigmaDesignIdentifier,
	fileResponse: GetFileResponse,
	fileMetaResponse: GetFileMetaResponse,
) {
	let atlassianDesign: AtlassianDesign;
	if (!designId.nodeId) {
		atlassianDesign = transformFileToAtlassianDesign({
			fileKey: designId.fileKey,
			fileResponse,
			fileMetaResponse,
		});
	} else {
		atlassianDesign = transformNodeToAtlassianDesign({
			fileKey: designId.fileKey,
			nodeId: designId.nodeId,
			fileResponse,
			fileMetaResponse,
		});
	}

	return atlassianDesign;
}

describe('/figma', () => {
	describe('/webhook', () => {
		describe('FILE_UPDATE event', () => {
			const currentDate = new Date();
			let connectInstallation: ConnectInstallation;
			let figmaTeam: FigmaTeam;
			let adminFigmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;
			let fileKey: string;
			let webhookEventRequestBody: FigmaWebhookEventRequestBody;

			beforeEach(async () => {
				connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
				adminFigmaOAuth2UserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaOAuth2UserCredentialCreateParams({
							atlassianUserId: figmaTeam.figmaAdminAtlassianUserId,
							connectInstallationId: connectInstallation.id,
						}),
					);

				fileKey = generateFigmaFileKey();
				for (let i = 1; i <= 5; i++) {
					const associatedFigmaDesignCreateParams =
						generateAssociatedFigmaDesignCreateParams({
							designId: generateFigmaDesignIdentifier({
								fileKey,
								nodeId: `1:${i}`,
							}),
							connectInstallationId: connectInstallation.id,
						});

					await associatedFigmaDesignRepository.upsert(
						associatedFigmaDesignCreateParams,
					);
				}

				webhookEventRequestBody = generateFileUpdateWebhookEventRequestBody({
					webhook_id: figmaTeam.webhookId,
					file_key: fileKey,
					file_name: generateFigmaFileName(),
					passcode: figmaTeam.webhookPasscode,
				});

				jest
					.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
					.setSystemTime(currentDate);
			});

			afterEach(() => {
				jest.useRealTimers();
			});

			it('should fetch and submit the associated designs to Jira', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if no associated designs are found for the file key', async () => {
				const otherFileKey = generateFigmaFileKey();
				const otherFilewebhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaTeam.webhookId,
						file_key: otherFileKey,
						file_name: generateFigmaFileName(),
						passcode: figmaTeam.webhookPasscode,
					});

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(otherFilewebhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if Figma file is not found', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.NotFound,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.NotFound,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ingest designs for available Figma nodes and ignore deleted nodes', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: [
						...nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
						generateChildNode({ id: `9999:1` }),
						generateChildNode({ id: `9999:2` }),
					],
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should return a 200 if fetching Figma team name fails with non-auth error', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					status: HttpStatusCode.InternalServerError,
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should send an error event if fetching Figma designs fails with unexpected error', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.InternalServerError,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.InternalServerError,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.failed');
			});

			it("should set the FigmaTeam status to 'ERROR' and return a 200 if fetching Figma team name fails with auth error", async () => {
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					status: HttpStatusCode.Forbidden,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');

				const updatedFigmaTeam = await figmaTeamRepository.findByWebhookId(
					figmaTeam.webhookId,
				);
				expect(updatedFigmaTeam?.authStatus).toStrictEqual(
					FigmaTeamAuthStatus.ERROR,
				);
			});

			it("should set the FigmaTeam status to 'ERROR' and return a 200 if fetching Figma designs fails with auth error", async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);

				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.Unauthorized,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.Unauthorized,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');

				const updatedFigmaTeam = await figmaTeamRepository.findByWebhookId(
					figmaTeam.webhookId,
				);
				expect(updatedFigmaTeam?.authStatus).toStrictEqual(
					FigmaTeamAuthStatus.ERROR,
				);
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const webhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaTeam.webhookId,
						file_key: fileKey,
						file_name: generateFigmaFileName(),
						passcode: 'invalid',
					});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.BadRequest);
			});
		});

		describe('PING event', () => {
			it('should return a 200 when valid webhook', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
				const webhookEventRequestBody = generatePingWebhookEventRequestBody({
					webhook_id: figmaTeam.webhookId,
					passcode: figmaTeam.webhookPasscode,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
				const webhookEventRequestBody = generatePingWebhookEventRequestBody({
					webhook_id: figmaTeam.webhookId,
					passcode: 'invalid',
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.BadRequest);
			});
		});

		it('should return a 400 if invalid request is received', async () => {
			await request(app)
				.post(buildAppUrl('figma/webhook').pathname)
				.send({ event_type: 'FILE_COMMENT', webhook_id: 1 })
				.expect(HttpStatusCode.BadRequest);
		});
	});

	describe('/webhook/file', () => {
		beforeAll(() => {
			jest.spyOn(launchDarkly, 'getLDClient').mockResolvedValue(null);
			jest.spyOn(launchDarkly, 'getFeatureFlag').mockResolvedValue(true);
		});

		describe('FILE_UPDATE event', () => {
			const currentDate = new Date();
			let connectInstallation: ConnectInstallation;
			let figmaFileWebhook: FigmaFileWebhook;
			let adminFigmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;
			let fileKey: string;
			let webhookEventRequestBody: FigmaWebhookEventRequestBody;

			beforeEach(async () => {
				connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				figmaFileWebhook = await figmaFileWebhookRepository.upsert(
					generateFigmaFileWebhook({
						eventType: FigmaFileWebhookEventType.FILE_UPDATE,
						createdBy: {
							connectInstallationId: connectInstallation.id,
							atlassianUserId: uuidv4(),
						},
					}),
				);
				adminFigmaOAuth2UserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaOAuth2UserCredentialCreateParams({
							atlassianUserId: figmaFileWebhook.createdBy.atlassianUserId,
							connectInstallationId: connectInstallation.id,
						}),
					);

				fileKey = generateFigmaFileKey();
				for (let i = 1; i <= 5; i++) {
					const associatedFigmaDesignCreateParams =
						generateAssociatedFigmaDesignCreateParams({
							designId: generateFigmaDesignIdentifier({
								fileKey,
								nodeId: `1:${i}`,
							}),
							connectInstallationId: connectInstallation.id,
						});

					await associatedFigmaDesignRepository.upsert(
						associatedFigmaDesignCreateParams,
					);
				}

				webhookEventRequestBody = generateFileUpdateWebhookEventRequestBody({
					webhook_id: figmaFileWebhook.webhookId,
					file_key: fileKey,
					file_name: generateFigmaFileName(),
					passcode: figmaFileWebhook.webhookPasscode,
				});

				jest
					.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
					.setSystemTime(currentDate);
			});

			afterEach(() => {
				jest.useRealTimers();
			});

			it('should fetch and submit the associated designs to Jira', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if no associated designs are found for the file key', async () => {
				const otherFileKey = generateFigmaFileKey();
				const otherFilewebhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaFileWebhook.webhookId,
						file_key: otherFileKey,
						file_name: generateFigmaFileName(),
						passcode: figmaFileWebhook.webhookPasscode,
					});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(otherFilewebhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if Figma file is not found', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.NotFound,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.NotFound,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ingest designs for available Figma nodes and ignore deleted nodes', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: [
						...nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
						generateChildNode({ id: `9999:1` }),
						generateChildNode({ id: `9999:2` }),
					],
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should send an error event if fetching Figma designs fails with unexpected error', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.InternalServerError,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.InternalServerError,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.failed');
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const webhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaFileWebhook.webhookId,
						file_key: fileKey,
						file_name: generateFigmaFileName(),
						passcode: 'invalid',
					});

				await request(app)
					.post(buildAppUrl('figma/webhook').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.BadRequest);
			});
		});

		describe('DEV_MODE_STATUS_UPDATE event', () => {
			const currentDate = new Date();
			let connectInstallation: ConnectInstallation;
			let figmaFileWebhook: FigmaFileWebhook;
			let adminFigmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;
			let fileKey: string;
			let webhookEventRequestBody: FigmaWebhookEventRequestBody;

			beforeEach(async () => {
				connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				figmaFileWebhook = await figmaFileWebhookRepository.upsert(
					generateFigmaFileWebhook({
						eventType: FigmaFileWebhookEventType.DEV_MODE_STATUS_UPDATE,
						createdBy: {
							connectInstallationId: connectInstallation.id,
							atlassianUserId: uuidv4(),
						},
					}),
				);
				adminFigmaOAuth2UserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaOAuth2UserCredentialCreateParams({
							atlassianUserId: figmaFileWebhook.createdBy.atlassianUserId,
							connectInstallationId: connectInstallation.id,
						}),
					);

				fileKey = generateFigmaFileKey();
				for (let i = 1; i <= 5; i++) {
					const associatedFigmaDesignCreateParams =
						generateAssociatedFigmaDesignCreateParams({
							designId: generateFigmaDesignIdentifier({
								fileKey,
								nodeId: `1:${i}`,
							}),
							connectInstallationId: connectInstallation.id,
						});

					await associatedFigmaDesignRepository.upsert(
						associatedFigmaDesignCreateParams,
					);
				}

				webhookEventRequestBody = generateFileUpdateWebhookEventRequestBody({
					webhook_id: figmaFileWebhook.webhookId,
					file_key: fileKey,
					file_name: generateFigmaFileName(),
					passcode: figmaFileWebhook.webhookPasscode,
				});

				jest
					.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
					.setSystemTime(currentDate);
			});

			afterEach(() => {
				jest.useRealTimers();
			});

			it('should fetch and submit the associated designs to Jira', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if no associated designs are found for the file key', async () => {
				const otherFileKey = generateFigmaFileKey();
				const otherFilewebhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaFileWebhook.webhookId,
						file_key: otherFileKey,
						file_name: generateFigmaFileName(),
						passcode: figmaFileWebhook.webhookPasscode,
					});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(otherFilewebhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ignore if Figma file is not found', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.NotFound,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.NotFound,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should ingest designs for available Figma nodes and ignore deleted nodes', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId)
					.filter(isNotNullOrUndefined);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: [
						...nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
						generateChildNode({ id: `9999:1` }),
						generateChildNode({ id: `9999:2` }),
					],
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
							fileMetaResponse,
						),
				);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest(associatedAtlassianDesigns),
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.succeeded');
			});

			it('should send an error event if fetching Figma designs fails with unexpected error', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);

				mockFigmaGetFileEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					query: {
						ids: nodeIds.join(','),
						depth: '0',
						node_last_modified: 'true',
					},
					status: HttpStatusCode.InternalServerError,
				});
				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					accessToken: adminFigmaOAuth2UserCredentials.accessToken,
					fileKey: fileKey,
					status: HttpStatusCode.InternalServerError,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);

				await waitForEvent('job.handle-figma-file-update-event.failed');
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const webhookEventRequestBody =
					generateFileUpdateWebhookEventRequestBody({
						webhook_id: figmaFileWebhook.webhookId,
						file_key: fileKey,
						file_name: generateFigmaFileName(),
						passcode: 'invalid',
					});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.BadRequest);
			});
		});

		describe('PING event', () => {
			it('should return a 200 when valid webhook', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
				const webhookEventRequestBody = generatePingWebhookEventRequestBody({
					webhook_id: figmaTeam.webhookId,
					passcode: figmaTeam.webhookPasscode,
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
				const webhookEventRequestBody = generatePingWebhookEventRequestBody({
					webhook_id: figmaTeam.webhookId,
					passcode: 'invalid',
				});

				await request(app)
					.post(buildAppUrl('figma/webhook/file').pathname)
					.send(webhookEventRequestBody)
					.expect(HttpStatusCode.BadRequest);
			});
		});

		it('should return a 400 if invalid request is received', async () => {
			await request(app)
				.post(buildAppUrl('figma/webhook/file').pathname)
				.send({ event_type: 'FILE_COMMENT', webhook_id: 1 })
				.expect(HttpStatusCode.BadRequest);
		});
	});

	describe('/oauth/callback', () => {
		const getTokenQueryParams = generateGetOAuth2TokenQueryParams({
			redirect_uri: new URL('figma/oauth/callback', getConfig().app.baseUrl),
		});

		const basicAuthHeader = generateOAuth2BasicAuthHeader({
			client_id: getConfig().figma.oauth2.clientId,
			client_secret: getConfig().figma.oauth2.clientSecret,
		});

		it('should redirect to success page if auth callback to Figma succeeds', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL.toString())
				.post('/v1/oauth/token')
				.query(getTokenQueryParams)
				.matchHeader('Content-Type', 'application/x-www-form-urlencoded')
				.matchHeader('Authorization', basicAuthHeader)
				.reply(HttpStatusCode.Ok, generateGetOAuth2TokenResponse());

			return request(app)
				.get(buildAppUrl('figma/oauth/callback').pathname)
				.query({
					state: generateFigmaOAuth2State({
						atlassianUserId,
						appBaseUrl: getConfig().app.baseUrl,
						connectClientKey: connectInstallation.clientKey,
						secretKey: getConfig().figma.oauth2.stateSecretKey,
					}),
					code: getTokenQueryParams.code,
				})
				.expect(HttpStatusCode.Found)
				.expect(
					'Location',
					new URL(
						`static/auth-result/success`,
						getConfig().app.baseUrl,
					).toString(),
				);
		});

		it('should redirect to failure page if auth callback is invalid', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL.toString())
				.post('/v1/oauth/token')
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Unauthorized);

			return request(app)
				.get(buildAppUrl('figma/oauth/callback').pathname)
				.query({
					state: generateFigmaOAuth2State({
						atlassianUserId,
						appBaseUrl: getConfig().app.baseUrl,
						connectClientKey: connectInstallation.clientKey,
						secretKey: uuidv4(),
					}),
					code: getTokenQueryParams.code,
				})
				.expect(HttpStatusCode.Found)
				.expect(
					'Location',
					new URL(
						`static/auth-result/failure`,
						getConfig().app.baseUrl,
					).toString(),
				);
		});

		it('should redirect to failure page if auth callback to Figma fails', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL.toString())
				.post('/v1/oauth/token')
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Unauthorized);

			return request(app)
				.get(buildAppUrl('figma/oauth/callback').pathname)
				.query({
					state: generateFigmaOAuth2State({
						atlassianUserId,
						appBaseUrl: getConfig().app.baseUrl,
						connectClientKey: connectInstallation.clientKey,
						secretKey: getConfig().figma.oauth2.stateSecretKey,
					}),
					code: getTokenQueryParams.code,
				})
				.expect(HttpStatusCode.Found)
				.expect(
					'Location',
					new URL(
						`static/auth-result/failure`,
						getConfig().app.baseUrl,
					).toString(),
				);
		});
	});
});
