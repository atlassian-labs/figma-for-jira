import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import {
	generateGetEntityByUrlAuthorisationHeader,
	generateGetEntityByUrlRequestBody,
	generateOnEntityAssociatedAuthorisationHeader,
	generateOnEntityAssociatedRequestBody,
	generateOnEntityDisassociatedAuthorisationHeader,
	generateOnEntityDisassociatedRequestBody,
} from './testing';

import app from '../../../app';
import { getConfig } from '../../../config';
import { buildJiraIssueUrl } from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateJiraIssue,
	generateJiraIssueAri,
	generateJiraIssueId,
	generateJiraIssueUrl,
} from '../../../domain/entities/testing';
import {
	generateChildNode,
	generateCreateDevResourcesRequest,
	generateEmptyDevResourcesResponse,
	generateGetDevResourcesResponse,
	generateGetFileMetaResponse,
	generateGetFileResponseWithNode,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	transformFileMetaToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from '../../../infrastructure/figma/transformers';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';
import {
	generateJiraServerSymmetricJwtToken,
	mockFigmaCreateDevResourcesEndpoint,
	mockFigmaDeleteDevResourcesEndpoint,
	mockFigmaGetDevResourcesEndpoint,
	mockFigmaGetFileEndpoint,
	mockFigmaGetFileMetaEndpoint,
	mockJiraGetIssueEndpoint,
} from '../../testing';

describe('/entities', () => {
	describe('/getEntityByUrl', () => {
		beforeEach(() => {
			jest
				.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
				.setSystemTime(Date.now());
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
			const figmaFileMetaResponse = generateGetFileMetaResponse();
			const expectedDesign = transformFileMetaToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				fileMetaResponse: figmaFileMetaResponse,
			});

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: figmaFileMetaResponse,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputFigmaFileUrl.toString(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
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
			const figmaFileMetaResponse = generateGetFileMetaResponse();
			const figmaFileResponse = generateGetFileResponseWithNode({
				node: generateChildNode({ id: figmaDesignId.nodeId }),
			});
			const expectedDesign = transformNodeToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				nodeId: figmaDesignId.nodeId!,
				fileResponse: figmaFileResponse,
				fileMetaResponse: figmaFileMetaResponse,
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
				response: figmaFileResponse,
			});
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: figmaFileMetaResponse,
			});

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputFigmaFileNodeUrl.toString(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok)
				.expect(expectedDesign);
		});

		it('should respond with `HTTP 400` when `user` parameter is not given', async () => {
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
				.send({
					entity: {
						url: generateFigmaDesignUrl().toString(),
					},
				})
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 400` when given URL has unexpected format', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
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
						userId: atlassianUserId,
					}),
				)
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 401` when given JWT token is not valid', async () => {
			const atlassianUserId = uuidv4();

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(generateGetEntityByUrlRequestBody({ userId: atlassianUserId }))
				.set('Authorization', `JWT INVALID_TOKEN`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond with `HTTP 403` when app is authorized to access Figma on behalf of user', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();

			return request(app)
				.post('/entities/getEntityByUrl')
				.send(generateGetEntityByUrlRequestBody({ userId: atlassianUserId }))
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
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
			const inputFigmaUrl = generateFigmaDesignUrl({
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
				.send(
					generateGetEntityByUrlRequestBody({
						url: inputFigmaUrl.toString(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateGetEntityByUrlAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.NotFound);
		});
	});

	describe('/onEntityAssociated', () => {
		it('should create Figma Dev Resource and store associated Design data', async () => {
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
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const figmaFileMetaResponse = generateGetFileMetaResponse();

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: figmaFileMetaResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey: figmaDesignId.fileKey,
					nodeId: '0:0',
				}),
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual({
				id: expect.anything(),
				designId: figmaDesignId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
				inputUrl: undefined,
			});
		});

		it('should skip creating Figma Dev Resource when Issue with given ID is not found', async () => {
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
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const figmaFileMetaResponse = generateGetFileMetaResponse();

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: figmaFileMetaResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual({
				id: expect.anything(),
				designId: figmaDesignId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
				inputUrl: undefined,
			});
		});

		it('should skip creating Figma Dev Resource when `user` parameter is not given', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual({
				id: expect.anything(),
				designId: figmaDesignId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
				inputUrl: undefined,
			});
		});

		it('should handle when app is not authorised to view the Issue', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateJiraServerSymmetricJwtToken({
						request: {
							method: 'PUT',
							pathname: '/entities/onEntityAssociated',
						},
						connectInstallation,
					})}`,
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual({
				id: expect.anything(),
				designId: figmaDesignId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
				inputUrl: undefined,
			});
		});

		it('should handle when app is not authorised to access Figma on behalf of user', async () => {
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
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				status: HttpStatusCode.Forbidden,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey: figmaDesignId.fileKey,
					nodeId: '0:0',
				}),
				status: HttpStatusCode.Forbidden,
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual({
				id: expect.anything(),
				designId: figmaDesignId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
				inputUrl: undefined,
			});
		});

		it('should handle when Figma Dev Resource and associated Design data already exist', async () => {
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
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});
			const figmaFileMetaResponse = generateGetFileMetaResponse();

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: figmaFileMetaResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey: figmaDesignId.fileKey,
					nodeId: '0:0',
				}),
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should respond with `HTTP 400` when design ID has unexpected format', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();

			await request(app)
				.put('/entities/onEntityAssociated')
				.send(
					generateOnEntityAssociatedRequestBody({
						entityId: '',
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 401` when given JWT token is not valid', async () => {
			return request(app)
				.put('/entities/onEntityAssociated')
				.set('Authorization', `JWT INVALID_TOKEN`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});
	});

	describe('/onEntityDisassociated', () => {
		it('should delete Figma Dev Resource and associated Design data', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				nodeId: '0:0',
				response: generateGetDevResourcesResponse({
					id: devResourceId,
					url: generateJiraIssueUrl({
						baseUrl: connectInstallation.baseUrl,
						key: issue.key,
					}),
				}),
			});
			mockFigmaDeleteDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				devResourceId,
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should skip deleting Figma Dev Resource when Issue with given ID is not found', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should skip creating Figma Dev Resource when `user` parameter is not given', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should handle when app is not authorised to view the Issue', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				nodeId: '0:0',
				response: generateGetDevResourcesResponse({
					id: devResourceId,
					url: generateJiraIssueUrl({
						baseUrl: connectInstallation.baseUrl,
						key: issue.key,
					}),
				}),
			});
			mockFigmaDeleteDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				devResourceId,
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should handle when app is not authorised to access Figma on behalf of user', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const associatedFigmaDesign =
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				nodeId: '0:0',
				response: generateGetDevResourcesResponse({
					id: devResourceId,
					url: generateJiraIssueUrl({
						baseUrl: connectInstallation.baseUrl,
						key: issue.key,
					}),
				}),
			});
			mockFigmaDeleteDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				devResourceId,
				status: HttpStatusCode.Forbidden,
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should handle when Figma Dev Resource and associated Design data do not exist', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				nodeId: '0:0',
				response: generateEmptyDevResourcesResponse(),
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId: issue.id,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
		});

		it('should respond with `HTTP 400` when design ID has unexpected format', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const atlassianUserId = uuidv4();

			await request(app)
				.put('/entities/onEntityDisassociated')
				.send(
					generateOnEntityDisassociatedRequestBody({
						entityId: '',
						userId: atlassianUserId,
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with `HTTP 401` when given JWT token is not valid', async () => {
			return request(app)
				.put('/entities/onEntityDisassociated')
				.set('Authorization', `JWT INVALID_TOKEN`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});
	});
});
