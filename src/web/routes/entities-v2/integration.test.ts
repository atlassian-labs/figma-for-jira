import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import {
	generateGetEntityByUrlAuthorisationHeader,
	generateGetEntityByUrlRequestBody,
} from './testing';

import app from '../../../app';
import { getConfig } from '../../../config';
import {
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaDesignUrlForBackfill,
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentialCreateParams,
} from '../../../domain/entities/testing';
import { figmaBackfillService } from '../../../infrastructure/figma';
import {
	generateChildNode,
	generateGetFileMetaResponse,
	generateGetFileResponseWithNode,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	transformFileMetaToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from '../../../infrastructure/figma/transformers';
import { generateSubmitDesignsRequest } from '../../../infrastructure/jira/jira-client/testing';
import {
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';
import { waitForEvent } from '../../../infrastructure/testing';
import {
	generateJiraServerSymmetricJwtToken,
	mockFigmaGetFileEndpoint,
	mockFigmaGetFileMetaEndpoint,
	mockJiraSubmitDesignsEndpoint,
} from '../../testing';

describe('/entities', () => {
	describe('/getEntityByUrl', () => {
		const currentDate = new Date();

		beforeEach(() => {
			jest
				.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
				.setSystemTime(currentDate);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should return design for given Figma File URL', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const inputFigmaFileUrl = generateFigmaDesignUrl({
				...figmaDesignId,
				mode: 'dev',
			});
			const fileMetaResponse = generateGetFileMetaResponse();
			const expectedDesign = transformFileMetaToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				fileMetaResponse,
			});

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: fileMetaResponse,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.query({ userId: atlassianUserId })
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputFigmaFileUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Ok)
				.expect(expectedDesign);
		});

		it('should return design for given Figma File Node URL', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: generateFigmaNodeId(),
			});
			const inputFigmaFileNodeUrl = generateFigmaDesignUrl(figmaDesignId);
			const fileMetaResponse = generateGetFileMetaResponse();
			const fileResponse = generateGetFileResponseWithNode({
				node: generateChildNode({ id: figmaDesignId.nodeId }),
			});
			const expectedDesign = transformNodeToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				nodeId: figmaDesignId.nodeId!,
				fileResponse,
				fileMetaResponse,
			});

			mockFigmaGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: {
					ids: figmaDesignId.nodeId!,
					depth: '0',
					node_last_modified: 'true',
				},
				response: fileResponse,
			});
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: fileMetaResponse,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.query({ userId: atlassianUserId })
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputFigmaFileNodeUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Ok)
				.expect(expectedDesign);
		});

		it('should respond with `HTTP 400` when `userId` query parameter is missing', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const jwt = generateJiraServerSymmetricJwtToken({
				request: {
					method: 'POST',
					pathname: '/entities/getEntityByUrl',
				},
				connectInstallation,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(generateGetEntityByUrlRequestBody())
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 400` when given URL is not supported', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const jwt = generateJiraServerSymmetricJwtToken({
				request: {
					method: 'POST',
					pathname: '/entities/getEntityByUrl',
				},
				connectInstallation,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(
					generateGetEntityByUrlRequestBody({
						url: 'http://figma.com/invalid',
					}),
				)
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 403` when app is authorized to access Figma on behalf of user', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();

			return request(app)
				.post('/entities/getEntityByUrl')
				.query({ userId: atlassianUserId })
				.send(generateGetEntityByUrlRequestBody())
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Forbidden);
		});

		it('should respond with `HTTP 404` when design is not found', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);
			const fileKey = generateFigmaFileKey();
			const inputDesignUrl = generateFigmaDesignUrl({
				fileKey,
			});

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.post('/entities/getEntityByUrl')
				.query({ userId: atlassianUserId })
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.NotFound);
		});

		describe('Backfill', () => {
			it('should return mininal design for given Figma URL and ingest full design asynchronously', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const atlassianUserId = uuidv4();
				const figmaUserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaOAuth2UserCredentialCreateParams({
							atlassianUserId,
							connectInstallationId: connectInstallation.id,
						}),
					);
				const figmaDesignId = generateFigmaDesignIdentifier({
					nodeId: undefined,
				});
				const inputFigmaDesignUrl = generateFigmaDesignUrlForBackfill({
					...figmaDesignId,
					mode: 'dev',
				});
				const fileMetaResponse = generateGetFileMetaResponse();
				const expectedMinimalDesign =
					figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
				const expectedFullDesign = transformFileMetaToAtlassianDesign({
					fileKey: figmaDesignId.fileKey,
					fileMetaResponse,
				});

				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: figmaDesignId.fileKey,
					accessToken: figmaUserCredentials.accessToken,
					response: fileMetaResponse,
				});
				mockJiraSubmitDesignsEndpoint({
					baseUrl: connectInstallation.baseUrl,
					request: generateSubmitDesignsRequest([expectedFullDesign]),
				});

				await request(app)
					.post('/entities/getEntityByUrl')
					.query({ userId: atlassianUserId })
					.send(
						generateGetEntityByUrlRequestBody({
							url: inputFigmaDesignUrl.toString(),
						}),
					)
					.set(
						'Authorization',
						generateGetEntityByUrlAuthorisationHeader({
							connectInstallation,
							userId: atlassianUserId,
						}),
					)
					.set('Content-Type', 'application/json')
					.set('User-Id', uuidv4())
					.expect(HttpStatusCode.Ok)
					.expect(expectedMinimalDesign);
				await waitForEvent('job.submit-full-design.succeeded');
			});

			it('should return mininal design for given Figma URL when design is not available in Figma', async () => {
				const connectInstallation = await connectInstallationRepository.upsert(
					generateConnectInstallationCreateParams(),
				);
				const atlassianUserId = uuidv4();
				const figmaUserCredentials =
					await figmaOAuth2UserCredentialsRepository.upsert(
						generateFigmaOAuth2UserCredentialCreateParams({
							atlassianUserId,
							connectInstallationId: connectInstallation.id,
						}),
					);
				const figmaDesignId = generateFigmaDesignIdentifier({
					nodeId: undefined,
				});
				const inputFigmaUrl = generateFigmaDesignUrlForBackfill({
					...figmaDesignId,
					mode: 'dev',
				});
				const expectedMinimalDesign =
					figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaUrl);

				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: figmaDesignId.fileKey,
					accessToken: figmaUserCredentials.accessToken,
					status: HttpStatusCode.NotFound,
				});

				await request(app)
					.post('/entities/getEntityByUrl')
					.query({ userId: atlassianUserId })
					.send(
						generateGetEntityByUrlRequestBody({
							url: inputFigmaUrl.toString(),
						}),
					)
					.set(
						'Authorization',
						generateGetEntityByUrlAuthorisationHeader({
							connectInstallation,
							userId: atlassianUserId,
						}),
					)
					.set('Content-Type', 'application/json')
					.set('User-Id', uuidv4())
					.expect(HttpStatusCode.Ok)
					.expect(expectedMinimalDesign);
				await waitForEvent('job.submit-full-design.cancelled');
			});
		});
	});
});
