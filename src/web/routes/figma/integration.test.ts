import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { FAILURE_PAGE_URL, SUCCESS_PAGE_URL } from './figma-router';
import { generateFigmaWebhookEventPayload } from './testing';
import type { FigmaWebhookEventPayload } from './types';

import app from '../../../app';
import { getConfig } from '../../../config';
import {
	type AssociatedFigmaDesign,
	type AtlassianDesign,
	type ConnectInstallation,
	type FigmaTeam,
	FigmaTeamAuthStatus,
	type FigmaWebhookEventType,
} from '../../../domain/entities';
import {
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallation,
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
	generateFigmaTeamCreateParams,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
import type { FileResponse } from '../../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateGetFileResponseWithNodes,
	generateGetOAuth2TokenQueryParams,
	generateGetOAuth2TokenResponse,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from '../../../infrastructure/figma/transformers';
import type {
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../../../infrastructure/jira/jira-client';
import { generateSuccessfulSubmitDesignsResponse } from '../../../infrastructure/jira/jira-client/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';

const FIGMA_OAUTH_API_BASE_URL = getConfig().figma.oauthApiBaseUrl;
const FIGMA_OAUTH_CALLBACK_ENDPOINT = '/figma/oauth/callback';
const FIGMA_OAUTH_TOKEN_ENDPOINT = '/api/oauth/token';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_API_ME_ENDPOINT = '/v1/me';

const FIGMA_WEBHOOK_EVENT_ENDPOINT = '/figma/webhook';

function generateAtlassianDesign(
	associatedFigmaDesign: AssociatedFigmaDesign,
	fileResponse: FileResponse,
) {
	const { designId } = associatedFigmaDesign;
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

const mockMeEndpoint = ({ success = true }: { success?: boolean } = {}) => {
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_API_ME_ENDPOINT)
		.reply(success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden)
		.persist();
};

const mockGetFileWithNodesEndpoint = ({
	fileKey = uuidv4(),
	nodeIds,
	response = generateGetFileResponseWithNodes({
		nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
	}),
	success = true,
}: {
	fileKey?: string;
	nodeIds: string[];
	response?: FileResponse;
	success?: boolean;
}) => {
	nock(FIGMA_API_BASE_URL)
		.get(`/v1/files/${fileKey}`)
		.query({ ids: nodeIds.join(','), node_last_modified: true })
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			response,
		);
};

const mockSubmitDesignsEndpoint = ({
	request,
	response,
	connectInstallation = generateConnectInstallation(),
	success = true,
}: {
	request: SubmitDesignsRequest;
	response: SubmitDesignsResponse;
	connectInstallation?: ConnectInstallation;
	success?: boolean;
}) => {
	nock(connectInstallation.baseUrl)
		.post('/rest/designs/1.0/bulk', request)
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			response,
		);
};

const mockGetTeamProjectsEndpoint = ({
	teamId = uuidv4(),
	teamName = uuidv4(),
	success = true,
}: {
	teamId?: string;
	teamName?: string;
	success?: boolean;
} = {}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(FIGMA_API_BASE_URL)
		.get(`/v1/teams/${teamId}/projects`)
		.reply(statusCode, { name: teamName, projects: [] });
};

describe('/figma', () => {
	describe('/webhook', () => {
		describe('FILE_UPDATE event', () => {
			let connectInstallation: ConnectInstallation;
			let figmaTeam: FigmaTeam;
			let fileKey: string;
			let webhookEventPayload: FigmaWebhookEventPayload;

			beforeEach(async () => {
				const connectInstallationCreateParams =
					generateConnectInstallationCreateParams();
				connectInstallation = await connectInstallationRepository.upsert(
					connectInstallationCreateParams,
				);

				const figmaTeamCreateParams = generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
				});
				figmaTeam = await figmaTeamRepository.upsert(figmaTeamCreateParams);

				const validCredentialsParams = generateFigmaUserCredentialsCreateParams(
					{ atlassianUserId: figmaTeam.figmaAdminAtlassianUserId },
				);
				await figmaOAuth2UserCredentialsRepository.upsert(
					validCredentialsParams,
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
			});

			afterEach(async () => {
				// Cascading deletes will clean up corresponding FigmaTeam and AssociatedFigmaDesigns
				await connectInstallationRepository.deleteByClientKey(
					connectInstallation.clientKey,
				);
				await figmaOAuth2UserCredentialsRepository.delete(
					figmaTeam.figmaAdminAtlassianUserId,
				);
			});

			it('should fetch and submit the associated designs to Jira', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns.flatMap(({ designId }) =>
					designId.nodeId ? designId.nodeId : [],
				);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) => generateAtlassianDesign(design, fileResponse),
				);

				mockMeEndpoint();
				mockGetTeamProjectsEndpoint({
					teamId: figmaTeam.teamId,
					teamName: figmaTeam.teamName,
				});
				mockGetFileWithNodesEndpoint({
					fileKey: fileKey,
					nodeIds,
					response: fileResponse,
				});
				mockSubmitDesignsEndpoint({
					request: {
						designs: associatedAtlassianDesigns.map((atlassianDesign) => ({
							...atlassianDesign,
							addAssociations: null,
							removeAssociations: null,
						})),
					},
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
					connectInstallation,
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 200 if fetching team name from Figma fails', async () => {
				const associatedFigmaDesigns =
					await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
						fileKey,
						connectInstallation.id,
					);
				const nodeIds = associatedFigmaDesigns.flatMap(({ designId }) =>
					designId.nodeId ? designId.nodeId : [],
				);
				const fileResponse = generateGetFileResponseWithNodes({
					nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
				});
				const associatedAtlassianDesigns = associatedFigmaDesigns.map(
					(design) => generateAtlassianDesign(design, fileResponse),
				);
				mockMeEndpoint();
				mockGetTeamProjectsEndpoint({
					teamId: figmaTeam.teamId,
					teamName: figmaTeam.teamName,
					success: false,
				});
				mockGetFileWithNodesEndpoint({
					fileKey: fileKey,
					nodeIds,
					response: fileResponse,
				});
				mockSubmitDesignsEndpoint({
					request: {
						designs: associatedAtlassianDesigns.map((atlassianDesign) => ({
							...atlassianDesign,
							addAssociations: null,
							removeAssociations: null,
						})),
					},
					response: generateSuccessfulSubmitDesignsResponse(
						associatedAtlassianDesigns.map(
							(atlassianDesign) => atlassianDesign.id,
						),
					),
					connectInstallation,
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(webhookEventPayload)
					.expect(HttpStatusCode.Ok);
			});

			it("should set the FigmaTeam status to 'ERROR' and return a 200 if we can't get valid OAuth2 credentials", async () => {
				mockMeEndpoint({ success: false });

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
				const nodeIds = associatedFigmaDesigns.flatMap(({ designId }) =>
					designId.nodeId ? designId.nodeId : [],
				);

				mockMeEndpoint();
				mockGetTeamProjectsEndpoint({
					teamId: figmaTeam.teamId,
					teamName: figmaTeam.teamName,
				});
				for (const { designId } of associatedFigmaDesigns) {
					mockGetFileWithNodesEndpoint({
						fileKey: designId.fileKey,
						nodeIds,
						success: false,
					});
				}

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
		const userId = 'authorized-user-id';
		const getTokenQueryParams = generateGetOAuth2TokenQueryParams({
			client_id: getConfig().figma.clientId,
			client_secret: getConfig().figma.clientSecret,
			redirect_uri: `${
				getConfig().app.baseUrl
			}${FIGMA_OAUTH_CALLBACK_ENDPOINT}`,
		});

		it('should redirect to success page if auth callback to figma succeeds', () => {
			nock(FIGMA_OAUTH_API_BASE_URL)
				.post(FIGMA_OAUTH_TOKEN_ENDPOINT)
				.query(getTokenQueryParams)
				.reply(HttpStatusCode.Ok, generateGetOAuth2TokenResponse());

			return request(app)
				.get(
					`${FIGMA_OAUTH_CALLBACK_ENDPOINT}?state=${userId}&code=${getTokenQueryParams.code}`,
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
					`${FIGMA_OAUTH_CALLBACK_ENDPOINT}?state=${userId}&code=${getTokenQueryParams.code}`,
				)
				.expect(HttpStatusCode.Found)
				.expect('Location', FAILURE_PAGE_URL);
		});
	});
});
