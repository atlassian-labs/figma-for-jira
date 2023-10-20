import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { FAILURE_PAGE_URL, SUCCESS_PAGE_URL } from './figma-router';
import { generateFigmaWebhookEventPayload } from './testing';
import type { FigmaWebhookEventPayload } from './types';

import app from '../../../app';
import { isString } from '../../../common/stringUtils';
import { getConfig } from '../../../config';
import type {
	AtlassianDesign,
	ConnectInstallation,
	FigmaDesignIdentifier,
	FigmaTeam,
	FigmaWebhookEventType,
} from '../../../domain/entities';
import { FigmaTeamAuthStatus } from '../../../domain/entities';
import {
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallation,
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateFigmaTeamCreateParams,
} from '../../../domain/entities/testing';
import type { FileResponse } from '../../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateGetFileResponseWithNodes,
	generateGetOAuth2TokenQueryParams,
	generateGetOAuth2TokenResponse,
	generateGetTeamProjectsResponse,
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
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';
import {
	mockFigmaGetFileWithNodesEndpoint,
	mockFigmaGetTeamProjectsEndpoint,
	mockFigmaMeEndpoint,
	mockJiraSubmitDesignsEndpoint,
} from '../../testing';
import { generateFigmaOAuth2State } from '../../testing/figma-jwt-token-mocks';

const FIGMA_OAUTH_API_BASE_URL =
	getConfig().figma.oauth2.authorizationServerBaseUrl;
const FIGMA_OAUTH_CALLBACK_ENDPOINT = '/figma/oauth/callback';
const FIGMA_OAUTH_TOKEN_ENDPOINT = '/api/oauth/token';

const FIGMA_WEBHOOK_EVENT_ENDPOINT = '/figma/webhook';

function generateAtlassianDesignFromDesignIdAndFileResponse(
	designId: FigmaDesignIdentifier,
	fileResponse: FileResponse,
) {
	let atlassianDesign: AtlassianDesign;
	if (!designId.nodeId) {
		atlassianDesign = transformFileToAtlassianDesign({
			fileKey: designId.fileKey,
			fileResponse,
		});
	} else {
		atlassianDesign = transformNodeToAtlassianDesign({
			fileKey: designId.fileKey,
			nodeId: designId.nodeId,
			fileResponse,
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
			let fileKey: string;
			let webhookEventPayload: FigmaWebhookEventPayload;

			beforeEach(async () => {
				connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				figmaTeam = await figmaTeamRepository.upsert(
					generateFigmaTeamCreateParams({
						connectInstallationId: connectInstallation.id,
					}),
				);
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
								nodeId: generateFigmaNodeId(),
							}),
							connectInstallationId: connectInstallation.id,
						});

					await associatedFigmaDesignRepository.upsert(
						associatedFigmaDesignCreateParams,
					);
				}

				webhookEventPayload = generateFigmaWebhookEventPayload({
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
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
						),
				);

				mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileWithNodesEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: fileKey,
					nodeIds,
					response: fileResponse,
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
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 200 if no associated designs are found for the file key', async () => {
				const otherFileKey = generateFigmaFileKey();
				const otherFileWebhookEventPayload = generateFigmaWebhookEventPayload({
					webhook_id: figmaTeam.webhookId,
					file_key: otherFileKey,
					file_name: generateFigmaFileName(),
					passcode: figmaTeam.webhookPasscode,
				});

				mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(otherFileWebhookEventPayload)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 200 if fetching team name from Figma fails', async () => {
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
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) =>
						generateAtlassianDesignFromDesignIdAndFileResponse(
							design.designId,
							fileResponse,
						),
				);
				mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					status: HttpStatusCode.InternalServerError,
				});
				mockFigmaGetFileWithNodesEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: fileKey,
					nodeIds,
					response: fileResponse,
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
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.Ok);
			});

			it("should set the FigmaTeam status to 'ERROR' and return a 200 if we can't get valid OAuth2 credentials", async () => {
				mockFigmaMeEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					status: HttpStatusCode.Forbidden,
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.Ok);

				const updatedFigmaTeam = await figmaTeamRepository.getByWebhookId(
					figmaTeam.webhookId,
				);
				expect(updatedFigmaTeam.authStatus).toStrictEqual(
					FigmaTeamAuthStatus.ERROR,
				);
			});

			it('should return a 400 if the passcode is invalid', async () => {
				const invalidPasscodePayload = generateFigmaWebhookEventPayload({
					webhook_id: figmaTeam.webhookId,
					file_key: fileKey,
					file_name: generateFigmaFileName(),
					passcode: 'invalid',
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(invalidPasscodePayload)
					.expect(HttpStatusCode.BadRequest);
			});

			it('should return a 500 if fetching designs from Figma fails', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns
					.map(({ designId }) => designId.nodeId!)
					.filter(isString);

				mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
				mockFigmaGetTeamProjectsEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					teamId: figmaTeam.teamId,
					response: generateGetTeamProjectsResponse({
						name: figmaTeam.teamName,
					}),
				});
				mockFigmaGetFileWithNodesEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: fileKey,
					nodeIds,
					status: HttpStatusCode.InternalServerError,
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.InternalServerError);
			});
		});

		describe('unsupported event type', () => {
			it.each([
				'PING',
				'FILE_VERSION_UPDATE',
				'FILE_DELETE',
				'LIBRARY_PUBLISH',
				'FILE_COMMENT',
			] as FigmaWebhookEventType[])(
				'should return a 200 response immediately',
				async (unsupportedEventType: FigmaWebhookEventType) => {
					const webhookEventPayload = generateFigmaWebhookEventPayload({
						event_type: unsupportedEventType,
						file_key: generateFigmaFileKey(),
						file_name: generateFigmaFileName(),
					});

					await request(app)
						.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
						.send(webhookEventPayload)
						.expect(HttpStatusCode.Ok);
				},
			);
		});
	});

	describe('/oauth/callback', () => {
		const getTokenQueryParams = generateGetOAuth2TokenQueryParams({
			client_id: getConfig().figma.oauth2.clientId,
			client_secret: getConfig().figma.oauth2.clientSecret,
			redirect_uri: `${
				getConfig().app.baseUrl
			}${FIGMA_OAUTH_CALLBACK_ENDPOINT}`,
		});

		it('should redirect to success page if auth callback to figma succeeds', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Ok, generateGetOAuth2TokenResponse());

			return request(app)
				.get(FIGMA_OAUTH_CALLBACK_ENDPOINT)
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
				.expect('Location', SUCCESS_PAGE_URL);
		});

		it('should redirect to failure page if auth callback is invalid', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Unauthorized);

			return request(app)
				.get(FIGMA_OAUTH_CALLBACK_ENDPOINT)
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
				.expect('Location', FAILURE_PAGE_URL);
		});

		it('should redirect to failure page if auth callback to figma fails', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallation(),
			);
			const atlassianUserId = uuidv4();

			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Unauthorized);

			return request(app)
				.get(FIGMA_OAUTH_CALLBACK_ENDPOINT)
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
				.expect('Location', FAILURE_PAGE_URL);
		});
	});
});
