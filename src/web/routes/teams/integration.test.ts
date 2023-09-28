import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { getConfig } from '../../../config';
import type {
	ConnectInstallation,
	FigmaOAuth2UserCredentials,
	FigmaTeamSummary,
} from '../../../domain/entities';
import { FigmaTeamAuthStatus } from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaTeamCreateParams,
	generateFigmaTeamSummary,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
import { figmaClient } from '../../../infrastructure/figma/figma-client';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
	RepositoryRecordNotFoundError,
} from '../../../infrastructure/repositories';
import { generateInboundRequestSymmetricJwtToken } from '../../testing';

const mockCreateWebhookEndpoint = ({
	webhookId = uuidv4(),
	teamId = uuidv4(),
	success = true,
}: {
	webhookId?: string;
	teamId?: string;
	success?: boolean;
} = {}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(FIGMA_API_BASE_URL)
		.post('/v2/webhooks')
		.reply(statusCode, {
			id: webhookId,
			team_id: teamId,
			event_type: 'FILE_UPDATE',
			client_id: getConfig().figma.clientId,
			endpoint: `${getConfig().app.baseUrl}/figma/webhooks`,
			passcode: 'NOT_USED',
			status: 'ACTIVE',
			description: 'Figma for Jira',
			protocol_version: '2',
		});
};

const mockFigmaDeleteWebhookEndpoint = ({
	webhookId,
	accessToken,
	status = HttpStatusCode.Ok,
}: {
	webhookId: string;
	accessToken: string;
	status: HttpStatusCode;
}) => {
	nock(FIGMA_API_BASE_URL, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.delete(`/v2/webhooks/${webhookId}`)
		.reply(status);
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

const mockMeEndpoint = ({ success = true }: { success?: boolean } = {}) => {
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_API_ME_ENDPOINT)
		.reply(success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden)
		.persist();
};

const figmaTeamSummaryComparer = (a: FigmaTeamSummary, b: FigmaTeamSummary) =>
	a.teamId.localeCompare(b.teamId);

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_API_ME_ENDPOINT = '/v1/me';

const TEAMS_CONFIGURE_ENDPOINT = '/teams/configure';
const TEAMS_LIST_ENDPOINT = '/teams/list';

describe('/teams', () => {
	describe('POST /configure', () => {
		let connectInstallation: ConnectInstallation;
		let figmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;

		beforeEach(async () => {
			connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			figmaOAuth2UserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams(),
				);
		});

		it('should create a webhook and FigmaTeam record', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();
			const webhookId = uuidv4();
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'POST',
				pathname: TEAMS_CONFIGURE_ENDPOINT,
				connectInstallation,
			});

			mockMeEndpoint();
			mockGetTeamProjectsEndpoint({ teamId, teamName });
			mockCreateWebhookEndpoint({ webhookId, teamId });

			await request(app)
				.post(TEAMS_CONFIGURE_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.send({ teamId })
				.expect(HttpStatusCode.Ok);

			const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);
			expect(figmaTeam).toEqual({
				id: expect.anything(),
				webhookId,
				webhookPasscode: figmaTeam.webhookPasscode,
				teamId,
				teamName,
				figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				authStatus: FigmaTeamAuthStatus.OK,
				connectInstallationId: connectInstallation.id,
			});
		});

		it('should return a 500 and not create a FigmaTeam when creating the webhook fails', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();
			const webhookId = uuidv4();
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'POST',
				pathname: TEAMS_CONFIGURE_ENDPOINT,
				connectInstallation,
			});

			mockMeEndpoint();
			mockGetTeamProjectsEndpoint({ teamId, teamName });
			mockCreateWebhookEndpoint({ webhookId, teamId, success: false });

			await request(app)
				.post(TEAMS_CONFIGURE_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.send({ teamId })
				.expect(HttpStatusCode.InternalServerError);

			await expect(
				figmaTeamRepository.getByWebhookId(webhookId),
			).rejects.toBeInstanceOf(RepositoryRecordNotFoundError);
		});
	});

	describe('DELETE /configure', () => {
		let connectInstallation: ConnectInstallation;
		let figmaOAuth2UserCredentials: FigmaOAuth2UserCredentials;

		beforeEach(async () => {
			connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			figmaOAuth2UserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams(),
				);
		});

		it('should delete the webhook and FigmaTeam record', async () => {
			jest.spyOn(figmaClient, 'deleteWebhook');

			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				}),
			);
			const queryParams = { teamId: figmaTeam.teamId };
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'DELETE',
				pathname: TEAMS_CONFIGURE_ENDPOINT,
				query: queryParams,
				connectInstallation,
			});

			mockMeEndpoint();
			mockFigmaDeleteWebhookEndpoint({
				webhookId: figmaTeam.webhookId,
				accessToken: figmaOAuth2UserCredentials.accessToken,
				status: HttpStatusCode.Ok,
			});

			await request(app)
				.delete(TEAMS_CONFIGURE_ENDPOINT)
				.query(queryParams)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', 'not-a-figma-team-admin')
				.expect(HttpStatusCode.Ok);

			await expect(
				figmaTeamRepository.getByWebhookId(figmaTeam.webhookId),
			).rejects.toBeInstanceOf(RepositoryRecordNotFoundError);
			expect(figmaClient.deleteWebhook).toBeCalledWith(
				figmaTeam.webhookId,
				figmaOAuth2UserCredentials.accessToken,
			);
		});

		it('should return a 200 and delete the FigmaTeam when deleting the webhook fails', async () => {
			const figmaTeam = await figmaTeamRepository.upsert(
				generateFigmaTeamCreateParams({
					connectInstallationId: connectInstallation.id,
					figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				}),
			);
			const queryParams = { teamId: figmaTeam.teamId };
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'DELETE',
				pathname: TEAMS_CONFIGURE_ENDPOINT,
				query: queryParams,
				connectInstallation,
			});

			mockMeEndpoint();
			mockFigmaDeleteWebhookEndpoint({
				webhookId: figmaTeam.webhookId,
				accessToken: figmaOAuth2UserCredentials.accessToken,
				status: HttpStatusCode.InternalServerError,
			});

			await request(app)
				.delete(TEAMS_CONFIGURE_ENDPOINT)
				.query(queryParams)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', 'not-a-figma-team-admin')
				.expect(HttpStatusCode.Ok);

			await expect(
				figmaTeamRepository.getByWebhookId(figmaTeam.webhookId),
			).rejects.toBeInstanceOf(RepositoryRecordNotFoundError);
		});
	});

	describe('/list', () => {
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
					generateFigmaUserCredentialsCreateParams(),
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

			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'GET',
				pathname: TEAMS_LIST_ENDPOINT,
				connectInstallation: targetConnectInstallation,
			});

			mockMeEndpoint();

			const response = await request(app)
				.get(TEAMS_LIST_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.expect(HttpStatusCode.Ok);

			expect(
				(response.body as FigmaTeamSummary[]).sort(figmaTeamSummaryComparer),
			).toEqual(
				[team1, team2]
					.map((team) => generateFigmaTeamSummary(team))
					.sort(figmaTeamSummaryComparer),
			);
		});

		it('should return an empty list if there are no teams configured for the given connect installation', async () => {
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

			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'GET',
				pathname: TEAMS_LIST_ENDPOINT,
				connectInstallation: targetConnectInstallation,
			});

			mockMeEndpoint();

			const response = await request(app)
				.get(TEAMS_LIST_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.expect(HttpStatusCode.Ok);

			expect(response.body).toEqual([]);
		});
	});
});
