import type { FigmaTeam } from '@prisma/client';
import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { getConfig } from '../../../config';
import type {
	AssociatedFigmaDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import {
	FigmaDesignIdentity,
	FigmaTeamAuthStatus,
} from '../../../domain/entities';
import {
	generateAssociatedFigmaDesignCreateParams,
	generateConnectInstallation,
	generateConnectInstallationCreateParams,
	generateFigmaTeamCreateParams,
	generateFigmaUserCredentialsCreateParams,
	MOCK_FIGMA_FILE_KEY,
} from '../../../domain/entities/testing';
import type {
	FigmaWebhookEventPayload,
	FigmaWebhookEventType,
} from '../../../infrastructure/figma';
import { transformNodeToAtlassianDesign } from '../../../infrastructure/figma/figma-transformer';
import {
	generateFigmaWebhookEventPayload,
	generateGetFileNodesResponse,
} from '../../../infrastructure/figma/testing';
import { generateSuccessfulUpdateDesignsResponse } from '../../../infrastructure/jira/jira-client/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_API_ME_ENDPOINT = '/v1/me';

const FIGMA_WEBHOOK_EVENT_ENDPOINT = '/figma/webhook';

const mockMeEndpoint = ({ success = true }: { success?: boolean } = {}) => {
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_API_ME_ENDPOINT)
		.reply(success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden)
		.persist();
};

const mockGetFileNodesEndpoint = ({
	fileKey = uuidv4(),
	nodeId,
	success = true,
}: {
	fileKey?: string;
	nodeId: string;
	success?: boolean;
}) => {
	nock(FIGMA_API_BASE_URL)
		.get(`/v1/files/${fileKey}/nodes`)
		.query({ ids: nodeId })
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			success
				? generateGetFileNodesResponse({
						nodeId: nodeId,
				  })
				: undefined,
		);
};

const mockSubmitDesignsEndpoint = ({
	associatedFigmaDesigns = [],
	connectInstallation = generateConnectInstallation(),
	success = true,
}: {
	associatedFigmaDesigns?: AssociatedFigmaDesign[];
	connectInstallation?: ConnectInstallation;
	success?: boolean;
} = {}) => {
	const fileResponses = associatedFigmaDesigns.map((design) =>
		generateGetFileNodesResponse({ nodeId: design.designId.nodeId }),
	);
	const atlassianDesigns = fileResponses.map((response, i) =>
		transformNodeToAtlassianDesign({
			fileKey: associatedFigmaDesigns[i].designId.fileKey,
			nodeId: associatedFigmaDesigns[i].designId.nodeId!,
			fileNodesResponse: response,
		}),
	);
	nock(connectInstallation.baseUrl)
		.post('/rest/designs/1.0/bulk', {
			designs: atlassianDesigns.map((design) => ({
				...design,
				addAssociations: null,
				removeAssociations: null,
			})),
		})
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			success
				? generateSuccessfulUpdateDesignsResponse(
						atlassianDesigns.map((design) => design.id),
				  )
				: undefined,
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
				for (let i = 1; i <= 5; i++) {
					const associatedFigmaDesignCreateParams =
						generateAssociatedFigmaDesignCreateParams({
							designId: new FigmaDesignIdentity(
								MOCK_FIGMA_FILE_KEY,
								`${i}:${i}`,
							),
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
					file_key: MOCK_FIGMA_FILE_KEY,
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
				mockMeEndpoint();
				mockSubmitDesignsEndpoint({
					associatedFigmaDesigns,
					connectInstallation,
				});
				for (const associatedFigmaDesign of associatedFigmaDesigns) {
					const { designId } = associatedFigmaDesign;
					mockGetFileNodesEndpoint({
						fileKey: designId.fileKey,
						nodeId: designId.nodeId!,
					});
				}

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
				expect(updatedFigmaTeam.status).toStrictEqual(
					FigmaTeamAuthStatus.ERROR,
				);
			});

			it('should return a 500 if fetching designs from Figma fails', async () => {
				mockMeEndpoint();
				for (const { designId } of associatedFigmaDesigns) {
					mockGetFileNodesEndpoint({
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
