import { HttpStatusCode } from 'axios';
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
	generateFigmaOAuth2UserCredentialCreateParams,
	generateFigmaTeamCreateParams,
	generateFigmaTeamSummary,
} from '../../../domain/entities/testing';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
	RepositoryRecordNotFoundError,
} from '../../../infrastructure/repositories';
import {
	generateInboundRequestSymmetricJwtToken,
	mockCreateWebhookEndpoint,
	mockGetTeamProjectsEndpoint,
	mockMeEndpoint,
} from '../../testing';

const figmaTeamSummaryComparer = (a: FigmaTeamSummary, b: FigmaTeamSummary) =>
	a.teamId.localeCompare(b.teamId);

const TEAMS_CONFIGURE_ENDPOINT = '/teams/configure';
const TEAMS_LIST_ENDPOINT = '/teams/list';

describe('/teams', () => {
	describe('/configure', () => {
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
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'POST',
				pathname: TEAMS_CONFIGURE_ENDPOINT,
				connectInstallation,
			});

			mockMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
			mockGetTeamProjectsEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				teamId,
				teamName,
			});
			mockCreateWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId,
				teamId,
			});

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

			mockMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
			mockGetTeamProjectsEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				teamId,
				teamName,
			});
			mockCreateWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId,
				teamId,
				success: false,
			});

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

			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'GET',
				pathname: TEAMS_LIST_ENDPOINT,
				connectInstallation: targetConnectInstallation,
			});

			mockMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

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

			mockMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			const response = await request(app)
				.get(TEAMS_LIST_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.expect(HttpStatusCode.Ok);

			expect(response.body).toEqual([]);
		});
	});
});
