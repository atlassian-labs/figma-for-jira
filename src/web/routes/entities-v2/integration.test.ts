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
import { appendToPathname } from '../../../common/url-utils';
import { getConfig } from '../../../config';
import { buildJiraIssueUrl } from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaDesignUrlForBackfill,
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateJiraIssue,
	generateJiraIssueAri,
	generateJiraIssueId,
	generateJiraIssueUrl,
} from '../../../domain/entities/testing';
import { figmaBackfillService } from '../../../infrastructure/figma';
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
import { buildDesignUrl } from '../../../infrastructure/figma/transformers/utils';
import {
	generateGetIssuePropertyResponse,
	generateSubmitDesignsRequest,
} from '../../../infrastructure/jira/jira-client/testing';
import type { IssuePropertyInputDesignData } from '../../../infrastructure/jira/jira-design-issue-property-service';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';
import { waitForEvent } from '../../../infrastructure/testing';
import {
	generateJiraServerSymmetricJwtToken,
	mockFigmaCreateDevResourcesEndpoint,
	mockFigmaDeleteDevResourcesEndpoint,
	mockFigmaGetDevResourcesEndpoint,
	mockFigmaGetFileEndpoint,
	mockFigmaGetFileMetaEndpoint,
	mockJiraDeleteIssuePropertyEndpoint,
	mockJiraGetIssueEndpoint,
	mockJiraGetIssuePropertyEndpoint,
	mockJiraSetIssuePropertyEndpoint,
	mockJiraSubmitDesignsEndpoint,
} from '../../testing';

const issuePropertyKeys = {
	ATTACHED_DESIGN_URL: 'attached-design-url',
	ATTACHED_DESIGN_URL_V2: 'attached-design-url-v2',
} as const;

const buildDesignUrlForIssueProperties = ({
	url,
	displayName,
}: IssuePropertyInputDesignData): string => {
	const encodedName = encodeURIComponent(displayName).replaceAll('-', '%2D');
	const urlWithFileName = appendToPathname(new URL(url), encodedName);
	return urlWithFileName.toString();
};

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
				.expect(HttpStatusCode.Ok)
				.expect(expectedDesign);
		});

		it('should respond with `HTTP 400` when `userId` query parameter is not given', async () => {
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

		it('should respond with `HTTP 400` when given URL has unexpected format', async () => {
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

		it('should respond with `HTTP 401` when given JWT token is not valid', async () => {
			return request(app)
				.post('/entities/getEntityByUrl')
				.send(generateGetEntityByUrlRequestBody())
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
				const figmaFileMetaResponse = generateGetFileMetaResponse();
				const expectedMinimalDesign =
					figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
				const expectedFullDesign = transformFileMetaToAtlassianDesign({
					fileKey: figmaDesignId.fileKey,
					fileMetaResponse: figmaFileMetaResponse,
				});

				mockFigmaGetFileMetaEndpoint({
					baseUrl: getConfig().figma.apiBaseUrl,
					fileKey: figmaDesignId.fileKey,
					accessToken: figmaUserCredentials.accessToken,
					response: figmaFileMetaResponse,
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
					.expect(HttpStatusCode.Ok)
					.expect(expectedMinimalDesign);
				await waitForEvent('job.submit-full-design.succeeded');
			});

			it('should return mininal design for given Figma URL and skip full ingestion when design is not available in Figma', async () => {
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
					.expect(HttpStatusCode.Ok)
					.expect(expectedMinimalDesign);
				await waitForEvent('job.submit-full-design.cancelled');
			});
		});
	});

	describe('/onEntityAssociated', () => {
		it('should update Jira Issue Properties, create Figma Dev Resource and store associated Design data', async () => {
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
			const design = transformFileMetaToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				fileMetaResponse: figmaFileMetaResponse,
			});
			const expectedIssuePropertyDesignUrl =
				buildDesignUrlForIssueProperties(design);

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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				request: JSON.stringify(expectedIssuePropertyDesignUrl),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: design.displayName,
						},
					]),
				),
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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
			const design = transformFileMetaToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				fileMetaResponse: figmaFileMetaResponse,
			});
			const expectedIssuePropertyDesignUrl =
				buildDesignUrlForIssueProperties(design);

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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				request: JSON.stringify(expectedIssuePropertyDesignUrl),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: design.displayName,
						},
					]),
				),
			});

			await request(app)
				.put('/entities/onEntityAssociated')
				.query({ userId: atlassianUserId })
				.send(
					generateOnEntityAssociatedRequestBody({
						issueId,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
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

		it('should skip creating Figma Dev Resource when `user` query parameter is not given', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const expectedIssuePropertyDesignUrl = buildDesignUrlForIssueProperties({
				url: buildDesignUrl(figmaDesignId).toString(),
				displayName: 'Untitled',
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				request: JSON.stringify(expectedIssuePropertyDesignUrl),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: 'Untitled',
						},
					]),
				),
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

		it('should handle when app is not authorised to update Issue Properties', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const figmaDesignId = generateFigmaDesignIdentifier({
				nodeId: undefined,
			});
			const expectedIssuePropertyDesignUrl = buildDesignUrlForIssueProperties({
				url: buildDesignUrl(figmaDesignId).toString(),
				displayName: 'Untitled',
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				status: HttpStatusCode.NotFound,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				request: JSON.stringify(expectedIssuePropertyDesignUrl),
				status: HttpStatusCode.Forbidden,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: 'Untitled',
						},
					]),
				),
				status: HttpStatusCode.Forbidden,
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
			const expectedIssuePropertyDesignUrl = buildDesignUrlForIssueProperties({
				url: buildDesignUrl(figmaDesignId).toString(),
				displayName: 'Untitled',
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				request: JSON.stringify(expectedIssuePropertyDesignUrl),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: 'Untitled',
						},
					]),
				),
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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

		it('should handle when Jira Issue Properties, Figma Dev Resource and associated Design data exist', async () => {
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
			const design = transformFileMetaToAtlassianDesign({
				fileKey: figmaDesignId.fileKey,
				fileMetaResponse: figmaFileMetaResponse,
			});
			const expectedIssuePropertyDesignUrl =
				buildDesignUrlForIssueProperties(design);

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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: JSON.stringify(expectedIssuePropertyDesignUrl),
				}),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: design.displayName,
						},
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(
					JSON.stringify([
						{
							url: expectedIssuePropertyDesignUrl,
							name: design.displayName,
						},
					]),
				),
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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
				.query({ userId: atlassianUserId })
				.send(
					generateOnEntityAssociatedRequestBody({
						entityId: '',
					}),
				)
				.set(
					'Authorization',
					generateOnEntityAssociatedAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
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
		it('should update Jira Issue Properties, delete Figma Dev Resource and associated Design data', async () => {
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: buildDesignUrl(figmaDesignId),
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{ url: buildDesignUrl(figmaDesignId), name: 'Test Design' },
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([])),
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: buildDesignUrl(figmaDesignId),
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{ url: buildDesignUrl(figmaDesignId), name: 'Test Design' },
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([])),
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.query({ userId: atlassianUserId })
				.send(
					generateOnEntityDisassociatedRequestBody({
						issueId,
						issueAri,
						entityId: figmaDesignId.toAtlassianDesignId(),
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should skip creating Figma Dev Resource when `user` query parameter is not given', async () => {
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: buildDesignUrl(figmaDesignId),
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{ url: buildDesignUrl(figmaDesignId), name: 'Test Design' },
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([])),
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

		it('should handle when app is not authorised to update Issue Properties', async () => {
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: buildDesignUrl(figmaDesignId),
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.Forbidden,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{ url: buildDesignUrl(figmaDesignId), name: 'Test Design' },
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([])),
				status: HttpStatusCode.Forbidden,
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: buildDesignUrl(figmaDesignId),
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{ url: buildDesignUrl(figmaDesignId), name: 'Test Design' },
					]),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([])),
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
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
					}),
				)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Ok);
			expect(await associatedFigmaDesignRepository.getAll()).not.toContainEqual(
				associatedFigmaDesign,
			);
		});

		it('should handle when Jira Issue Properties, Figma Dev Resource and associated Design data do not exist', async () => {
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
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey: figmaDesignId.fileKey,
				nodeId: '0:0',
				response: generateEmptyDevResourcesResponse(),
			});

			await request(app)
				.put('/entities/onEntityDisassociated')
				.query({ userId: atlassianUserId })
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
						userId: atlassianUserId,
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
				.query({ userId: atlassianUserId })
				.send(
					generateOnEntityDisassociatedRequestBody({
						entityId: '',
					}),
				)
				.set(
					'Authorization',
					generateOnEntityDisassociatedAuthorisationHeader({
						connectInstallation,
						userId: atlassianUserId,
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
