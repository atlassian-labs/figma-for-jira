import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { generateConnectLifecycleRequest } from './testing';

import app from '../../../app';
import { getConfig } from '../../../config';
import {
	generateAssociatedFigmaDesign,
	generateConnectInstallationCreateParams,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateFigmaTeam,
} from '../../../domain/entities/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
	figmaTeamRepository,
} from '../../../infrastructure/repositories';
import {
	generateInboundRequestAsymmetricJwtToken,
	mockConnectGetKeyEndpoint,
	mockFigmaDeleteWebhookEndpoint,
	mockFigmaMeEndpoint,
} from '../../testing';

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

			mockConnectGetKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				response: publicKey,
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

			mockConnectGetKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				response: publicKey,
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
			const [targetConnectInstallation, otherConnectInstallation] =
				await Promise.all([
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
					connectInstallationRepository.upsert(
						generateConnectInstallationCreateParams(),
					),
				]);

			const [
				targetFigmaOAuth2UserCredentials1,
				targetFigmaOAuth2UserCredentials2,
				otherFigmaOAuth2UserCredentials,
			] = await Promise.all([
				figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						connectInstallationId: otherConnectInstallation.id,
					}),
				),
			]);
			const [targetFigmaTeam1, targetFigmaTeam2, otherFigmaTeam] =
				await Promise.all([
					figmaTeamRepository.upsert(
						generateFigmaTeam({
							figmaAdminAtlassianUserId:
								targetFigmaOAuth2UserCredentials1.atlassianUserId,
							connectInstallationId: targetConnectInstallation.id,
						}),
					),
					figmaTeamRepository.upsert(
						generateFigmaTeam({
							figmaAdminAtlassianUserId:
								targetFigmaOAuth2UserCredentials2.atlassianUserId,
							connectInstallationId: targetConnectInstallation.id,
						}),
					),
					figmaTeamRepository.upsert(
						generateFigmaTeam({
							connectInstallationId: otherConnectInstallation.id,
						}),
					),
				]);
			const [, otherAssociatedFigmaDesign] = await Promise.all([
				associatedFigmaDesignRepository.upsert(
					generateAssociatedFigmaDesign({
						connectInstallationId: targetConnectInstallation.id,
					}),
				),
				associatedFigmaDesignRepository.upsert(
					generateAssociatedFigmaDesign({
						connectInstallationId: otherConnectInstallation.id,
					}),
				),
			]);

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

			mockConnectGetKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				response: publicKey,
				status: HttpStatusCode.Ok,
			});
			mockFigmaMeEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: targetFigmaTeam1.webhookId,
				accessToken: targetFigmaOAuth2UserCredentials1.accessToken,
				status: HttpStatusCode.Ok,
			});
			mockFigmaDeleteWebhookEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				webhookId: targetFigmaTeam2.webhookId,
				accessToken: targetFigmaOAuth2UserCredentials2.accessToken,
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
			expect(await connectInstallationRepository.getAll()).toEqual([
				otherConnectInstallation,
			]);
			expect(await figmaTeamRepository.getAll()).toEqual([otherFigmaTeam]);
			expect(await figmaOAuth2UserCredentialsRepository.getAll()).toEqual([
				otherFigmaOAuth2UserCredentials,
			]);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([
				otherAssociatedFigmaDesign,
			]);
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

			mockConnectGetKeyEndpoint({
				baseUrl: getConfig().jira.connectKeyServerUrl,
				keyId,
				response: publicKey,
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
