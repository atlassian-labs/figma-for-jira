import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { getConfig } from '../../../config';
import type {
	ConnectInstallation,
	FigmaOAuth2UserCredentials,
} from '../../../domain/entities';
import { FigmaTeamAuthStatus } from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
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

const mockMeEndpoint = ({ success = true }: { success?: boolean } = {}) => {
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_API_ME_ENDPOINT)
		.reply(success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden)
		.persist();
};

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_API_ME_ENDPOINT = '/v1/me';

const TEAM_CONFIGURE_ENDPOINT = '/team/configure';

describe('/team', () => {
	describe('/configure', () => {
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
			const webhookId = uuidv4();
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'POST',
				pathname: TEAM_CONFIGURE_ENDPOINT,
				connectInstallation,
			});

			mockMeEndpoint();
			mockCreateWebhookEndpoint({ webhookId, teamId });

			await request(app)
				.post(TEAM_CONFIGURE_ENDPOINT)
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
				teamName: 'TODO',
				figmaAdminAtlassianUserId: figmaOAuth2UserCredentials.atlassianUserId,
				authStatus: FigmaTeamAuthStatus.OK,
				connectInstallationId: connectInstallation.id,
			});
		});

		it('should return a 500 and not create a FigmaTeam when creating the webhook fails', async () => {
			const teamId = uuidv4();
			const webhookId = uuidv4();
			const jwt = generateInboundRequestSymmetricJwtToken({
				method: 'POST',
				pathname: TEAM_CONFIGURE_ENDPOINT,
				connectInstallation,
			});

			mockMeEndpoint();
			mockCreateWebhookEndpoint({ webhookId, teamId, success: false });

			await request(app)
				.post(TEAM_CONFIGURE_ENDPOINT)
				.set('Authorization', `JWT ${jwt}`)
				.set('User-Id', figmaOAuth2UserCredentials.atlassianUserId)
				.send({ teamId })
				.expect(HttpStatusCode.InternalServerError);

			await expect(
				figmaTeamRepository.getByWebhookId(webhookId),
			).rejects.toBeInstanceOf(RepositoryRecordNotFoundError);
		});
	});
});
