import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { generateFigmaWebhookEventPayload } from './testing/mocks';
import type { FigmaWebhookEventPayload, FigmaWebhookEventType } from './types';

import app from '../../../app';
import { getConfig } from '../../../config';
import type {
	AssociatedFigmaDesign,
	ConnectInstallation,
	FigmaTeam,
} from '../../../domain/entities';
import { FigmaTeamAuthStatus } from '../../../domain/entities';
import {
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallation,
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateFigmaTeamCreateParams,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
import { figmaService } from '../../../infrastructure/figma';
import type { FileResponse } from '../../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateGetFileResponseWithNode,
	generateGetFileResponseWithNodeId,
} from '../../../infrastructure/figma/figma-client/testing';
import { transformNodeToAtlassianDesign } from '../../../infrastructure/figma/transformers';
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

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_API_ME_ENDPOINT = '/v1/me';

const FIGMA_WEBHOOK_EVENT_ENDPOINT = '/figma/webhook';

function generateDesignAndFileResponseAndAtlassianDesign(
	associatedFigmaDesign: AssociatedFigmaDesign,
) {
	const { designId } = associatedFigmaDesign;
	const fileResponse = generateGetFileResponseWithNodeId(designId.nodeId!);
	const atlassianDesign = transformNodeToAtlassianDesign({
		fileKey: designId.fileKey,
		nodeId: designId.nodeId!,
		fileResponse,
	});

	return { designId, fileResponse, atlassianDesign };
}

const mockMeEndpoint = ({ success = true }: { success?: boolean } = {}) => {
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_API_ME_ENDPOINT)
		.reply(success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden)
		.persist();
};

const mockGetFileWithNodesEndpoint = ({
	fileKey = uuidv4(),
	nodeId,
	response = generateGetFileResponseWithNode({
		node: generateChildNode({ id: nodeId }),
	}),
	success = true,
}: {
	fileKey?: string;
	nodeId: string;
	response?: FileResponse;
	success?: boolean;
}) => {
	nock(FIGMA_API_BASE_URL)
		.get(`/v1/files/${fileKey}`)
		.query({ ids: nodeId, node_last_modified: true })
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

describe('/figma', () => {
	describe('/webhook', () => {
		describe('FILE_UPDATE event', () => {
			let connectInstallation: ConnectInstallation;
			let figmaTeam: FigmaTeam;
			let associatedFigmaDesigns: AssociatedFigmaDesign[];
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

				associatedFigmaDesigns = [];
				const fileKey = generateFigmaFileKey();
				for (let i = 1; i <= 5; i++) {
					const associatedFigmaDesignCreateParams =
						generateAssociatedFigmaDesignCreateParams({
							designId: generateFigmaDesignIdentifier({
								fileKey,
								nodeId: `${i}:${i}`,
							}),
							connectInstallationId: connectInstallation.id,
						});

					associatedFigmaDesigns.push(
						await associatedFigmaDesignRepository.upsert(
							associatedFigmaDesignCreateParams,
						),
					);
				}

				webhookEventPayload = generateFigmaWebhookEventPayload({
					webhook_id: figmaTeam.webhookId,
					file_key: fileKey,
					passcode: figmaService.generateWebhookPasscode({
						atlassianUserId: figmaTeam.figmaAdminAtlassianUserId,
						figmaTeamId: figmaTeam.teamId,
						connectInstallationSecret: connectInstallation.sharedSecret,
					}),
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
				const entries = associatedFigmaDesigns.map(
					generateDesignAndFileResponseAndAtlassianDesign,
				);
				mockMeEndpoint();
				for (const { designId, fileResponse } of entries) {
					mockGetFileWithNodesEndpoint({
						fileKey: designId.fileKey,
						nodeId: designId.nodeId!,
						response: fileResponse,
					});
				}
				mockSubmitDesignsEndpoint({
					request: {
						designs: entries.map(({ atlassianDesign }) => ({
							...atlassianDesign,
							addAssociations: null,
							removeAssociations: null,
						})),
					},
					response: generateSuccessfulSubmitDesignsResponse(
						entries.map(({ atlassianDesign }) => atlassianDesign.id),
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

			it('should return a 200 if the passcode is invalid', async () => {
				const invalidPasscodePayload = generateFigmaWebhookEventPayload({
					webhook_id: figmaTeam.webhookId,
					file_key: associatedFigmaDesigns[0].designId.fileKey,
					passcode: 'invalid',
				});

				await request(app)
					.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
					.send(invalidPasscodePayload)
					.expect(HttpStatusCode.Ok);
			});

			it('should return a 500 if fetching designs from Figma fails', async () => {
				mockMeEndpoint();
				for (const { designId } of associatedFigmaDesigns) {
					mockGetFileWithNodesEndpoint({
						fileKey: designId.fileKey,
						nodeId: designId.nodeId!,
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
					});

					await request(app)
						.post(FIGMA_WEBHOOK_EVENT_ENDPOINT)
						.send(webhookEventPayload)
						.expect(HttpStatusCode.Ok);
				},
			);
		});
	});
});
