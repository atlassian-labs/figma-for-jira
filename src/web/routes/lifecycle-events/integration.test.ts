import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { generateConnectLifecycleRequest } from './testing';

import app from '../../../app';
import { getConfig } from '../../../config';
import {
	generateConnectInstallationCreateParams,
	generateFigmaTeam,
	generateFigmaUserCredentialsCreateParams,
} from '../../../domain/entities/testing';
import {
	connectInstallationRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';
import { generateInboundRequestAsymmetricJwtToken } from '../../testing';

const mockConnectKeyEndpoint = ({
	baseUrl,
	keyId,
	publicKey,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	keyId: string;
	publicKey: string;
	status: HttpStatusCode;
}) => {
	nock(baseUrl).get(`/${keyId}`).reply(status, publicKey);
};

const mockFigmaDeleteWebhookEndpoint = ({
	baseUrl,
	webhookId,
	accessToken,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	webhookId: string;
	accessToken: string;
	status: HttpStatusCode;
}) => {
	nock(baseUrl, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.delete(`/v2/webhooks/${webhookId}`)
		.reply(status);
};

describe('/lifecycleEvents', () => {
	describe('/installed', () => {
		it('should create a connect installation record', async () => {
			const clientKey = uuidv4();
			const installedRequest = generateConnectLifecycleRequest({ clientKey });
			const keyId = uuidv4();
			const { jwtToken, publicKey } =
				await generateInboundRequestAsymmetricJwtToken({
					keyId,
					method: 'POST',
					pathname: '/lifecycleEvents/installed',
					connectInstallation: {
						baseUrl: getConfig().app.baseUrl,
						clientKey,
					},
				});

			mockConnectKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				publicKey,
				status: HttpStatusCode.Ok,
			});

			await request(app)
				.post('/lifecycleEvents/installed')
				.set('Authorization', `JWT ${jwtToken}`)
				.send(installedRequest)
				.expect(HttpStatusCode.NoContent);
			expect(
				await connectInstallationRepository.getByClientKey(clientKey),
			).toEqual({
				id: expect.anything(),
				key: installedRequest.key,
				clientKey: installedRequest.clientKey,
				sharedSecret: installedRequest.sharedSecret,
				baseUrl: installedRequest.baseUrl,
				displayUrl: installedRequest.displayUrl,
			});
		});

		it('should respond 401 when JWT token is invalid (unknown issuer)', async () => {
			const keyId = uuidv4();
			const { jwtToken, publicKey } =
				await generateInboundRequestAsymmetricJwtToken({
					keyId,
					method: 'POST',
					pathname: '/incorrect-pathname',
					connectInstallation: {
						baseUrl: getConfig().app.baseUrl,
						clientKey: uuidv4(),
					},
				});

			mockConnectKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				publicKey,
				status: HttpStatusCode.Ok,
			});

			return request(app)
				.post('/lifecycleEvents/installed')
				.set('Authorization', `JWT ${jwtToken}`)
				.send(generateConnectLifecycleRequest())
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond 401 when JWT token is missing', () => {
			return request(app)
				.post('/lifecycleEvents/installed')
				.send(generateConnectLifecycleRequest())
				.expect(HttpStatusCode.Unauthorized);
		});
	});

	describe('/uninstalled', () => {
		it('should delete Figma webhook and application data', async () => {
			const [targetConnectInstallation, anotherConnectInstallation] =
				await Promise.all([
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
				]);
			const [targetFigmaTeam1, targetFigmaTeam2] = [
				generateFigmaTeam({
					connectInstallationId: targetConnectInstallation.id,
				}),
				generateFigmaTeam({
					connectInstallationId: targetConnectInstallation.id,
				}),
				generateFigmaTeam({
					connectInstallationId: anotherConnectInstallation.id,
				}),
			];
			const [targetFigmaUserCredentials1, targetFigmaUserCredentials2] = [
				generateFigmaUserCredentialsCreateParams({
					atlassianUserId: targetFigmaTeam1.figmaAdminAtlassianUserId,
				}),
				generateFigmaUserCredentialsCreateParams({
					atlassianUserId: targetFigmaTeam2.figmaAdminAtlassianUserId,
				}),
			];
			const keyId = uuidv4();
			const { jwtToken, publicKey } =
				await generateInboundRequestAsymmetricJwtToken({
					keyId,
					method: 'POST',
					pathname: '/lifecycleEvents/uninstalled',
					connectInstallation: {
						baseUrl: getConfig().app.baseUrl,
						clientKey: targetConnectInstallation.clientKey,
					},
				});

			mockConnectKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				publicKey,
				status: HttpStatusCode.Ok,
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: targetFigmaTeam1.webhookId,
				accessToken: targetFigmaUserCredentials1.accessToken,
				status: HttpStatusCode.Ok,
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: targetFigmaTeam2.webhookId,
				accessToken: targetFigmaUserCredentials2.accessToken,
				status: HttpStatusCode.Ok,
			});

			await request(app)
				.post('/lifecycleEvents/uninstalled')
				.set('Authorization', `JWT ${jwtToken}`)
				.send(
					generateConnectLifecycleRequest({
						key: getConfig().app.key,
						clientKey: targetConnectInstallation.clientKey,
					}),
				)
				.expect(HttpStatusCode.NoContent);
			expect(
				await figmaTeamRepository.findManyByConnectInstallationId(
					targetConnectInstallation.id,
				),
			).toEqual([]);
		});

		it('should respond 401 when JWT token is invalid (unknown issuer)', async () => {
			const keyId = uuidv4();
			const { jwtToken, publicKey } =
				await generateInboundRequestAsymmetricJwtToken({
					keyId,
					method: 'POST',
					pathname: '/incorrect-pathname',
					connectInstallation: {
						baseUrl: getConfig().app.baseUrl,
						clientKey: uuidv4(),
					},
				});

			mockConnectKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				publicKey,
				status: HttpStatusCode.Ok,
			});

			return request(app)
				.post('/lifecycleEvents/uninstalled')
				.set('Authorization', `JWT ${jwtToken}`)
				.send(generateConnectLifecycleRequest())
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond 401 when JWT token is missing', () => {
			return request(app)
				.post('/lifecycleEvents/uninstalled')
				.send(generateConnectLifecycleRequest())
				.expect(HttpStatusCode.Unauthorized);
		});
	});
});
