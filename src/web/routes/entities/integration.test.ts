import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type {
	AssociateEntityRequestBody,
	DisassociateEntityRequestBody,
} from './types';

import app from '../../../app';
import { appendToPathname } from '../../../common/url-utils';
import { getConfig } from '../../../config';
import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../../domain/entities';
import {
	AtlassianAssociation,
	AtlassianDesignStatus,
	AtlassianDesignType,
	buildJiraIssueUrl,
	FigmaDesignIdentifier,
	JIRA_ISSUE_ATI,
} from '../../../domain/entities';
import {
	generateConnectInstallationCreateParams,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentialCreateParams,
	generateJiraIssue,
	generateJiraIssueAri,
	generateJiraIssueId,
	generateJiraIssueUrl,
} from '../../../domain/entities/testing';
import { figmaBackfillService } from '../../../infrastructure/figma/figma-backfill-service';
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
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
} from '../../../infrastructure/figma/transformers/utils';
import {
	generateGetIssuePropertyResponse,
	generateSubmitDesignsRequest,
} from '../../../infrastructure/jira/jira-client/testing';
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
};

const buildDesignUrlForIssueProperties = ({
	url,
	displayName,
}: AtlassianDesign): string => {
	const encodedName = encodeURIComponent(displayName).replaceAll('-', '%2D');
	const urlWithFileName = appendToPathname(new URL(url), encodedName);
	return urlWithFileName.toString();
};

const generateAssociateEntityJwt = (
	connectInstallation: ConnectInstallation,
	atlassianUserId: string,
) => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'POST',
			pathname: '/entities/associateEntity',
			query: { userId: atlassianUserId },
		},
		connectInstallation,
	});
};

const generateDisassociateEntityJwt = (
	connectInstallation: ConnectInstallation,
	atlassianUserId: string,
) => {
	return generateJiraServerSymmetricJwtToken({
		request: {
			method: 'POST',
			pathname: '/entities/disassociateEntity',
			query: { userId: atlassianUserId },
		},
		connectInstallation,
	});
};

const generateAssociateEntityRequest = ({
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueId(),
	figmaDesignUrl = generateFigmaDesignUrl().toString(),
}: {
	issueId?: string;
	issueAri?: string;
	figmaDesignUrl?: string;
} = {}): AssociateEntityRequestBody => ({
	entity: {
		url: figmaDesignUrl,
	},
	associateWith: {
		ati: JIRA_ISSUE_ATI,
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
});

const generateDisassociateEntityRequest = ({
	issueId = generateJiraIssueId(),
	issueAri = generateJiraIssueId(),
	entityId = generateFigmaFileKey(),
}: {
	issueId?: string;
	issueAri?: string;
	entityId?: string;
} = {}): DisassociateEntityRequestBody => ({
	entity: {
		ari: 'TODO',
		id: entityId,
	},
	disassociateFrom: {
		ati: JIRA_ISSUE_ATI,
		ari: issueAri,
		cloudId: uuidv4(),
		id: issueId,
	},
});

describe('/entities', () => {
	describe('/associateEntity', () => {
		const currentDate = new Date();

		beforeEach(() => {
			jest
				.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
				.setSystemTime(currentDate);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should associate Figma file and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				mode: 'dev',
			});
			const fileMetaResponse = generateGetFileMetaResponse({
				name: fileName,
			});
			const atlassianDesign = transformFileMetaToAtlassianDesign({
				fileKey,
				fileMetaResponse,
			});
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: fileMetaResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...atlassianDesign,
						addAssociations: [
							// Nock does not correctly match a request body when provide an instance of a class
							// (e.g., as `AtlassianAssociation`). Therefore, pass an object instead.
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId: '0:0',
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(atlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(atlassianDesign),
							name: atlassianDesign.displayName,
						},
					]),
				),
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(atlassianDesign);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});

		it('should associate Figma node and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
				mode: 'dev',
			});
			const fileResponse = generateGetFileResponseWithNode({
				name: fileName,
				node,
			});
			const fileMetaResponse = generateGetFileMetaResponse();
			const atlassianDesign = transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				fileResponse,
				fileMetaResponse,
			});
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockFigmaGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: {
					ids: nodeId,
					depth: '0',
					node_last_modified: 'true',
				},
				response: fileResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...atlassianDesign,
						addAssociations: [
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId,
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(atlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(atlassianDesign),
							name: atlassianDesign.displayName,
						},
					]),
				),
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(atlassianDesign);
			expect(await associatedFigmaDesignRepository.getAll()).toStrictEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey, nodeId),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});

		it('should respond with 400 "userId" query parameter is missing', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const jwt = generateJiraServerSymmetricJwtToken({
				request: {
					method: 'POST',
					pathname: '/entities/associateEntity',
				},
				connectInstallation,
			});

			return request(app)
				.post('/entities/associateEntity')
				.send(generateAssociateEntityRequest())
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});

		it('should respond with 403 if credentials are not found', async () => {
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});

			return request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(generateAssociateEntityRequest({ issueId }))
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Forbidden);
		});

		it('should respond with 404 if design is not found', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
			});

			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.NotFound);
		});

		it('should respond with 500 if design fetching fails', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				mode: 'dev',
			});

			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				status: HttpStatusCode.InternalServerError,
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.InternalServerError);
		});
	});

	describe('/associateEntity (Backfill)', () => {
		const currentDate = new Date();

		beforeEach(() => {
			jest
				.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
				.setSystemTime(currentDate);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should associate Figma file and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				mode: 'dev',
			});
			inputFigmaDesignUrl.searchParams.set(
				'com.atlassian.designs.backfill',
				'true',
			);

			const fileMetaResponse = generateGetFileMetaResponse({
				name: fileName,
			});
			const minimalAtlassianDesign =
				figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...minimalAtlassianDesign,
						addAssociations: [
							// Nock does not correctly match a request body when provide an instance of a class
							// (e.g., as `AtlassianAssociation`). Therefore, pass an object instead.
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId: '0:0',
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(minimalAtlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(minimalAtlassianDesign),
							name: minimalAtlassianDesign.displayName,
						},
					]),
				),
			});
			// Mock endpoints called asynchronously in the background job.
			const atlassianDesign = transformFileMetaToAtlassianDesign({
				fileKey,
				fileMetaResponse,
			});
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: fileMetaResponse,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([atlassianDesign]),
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(minimalAtlassianDesign);
			await waitForEvent('job.submit-full-design.succeeded');
			expect(await associatedFigmaDesignRepository.getAll()).toStrictEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});

		it('should associate Figma node and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
				mode: 'dev',
			});
			inputFigmaDesignUrl.searchParams.set(
				'com.atlassian.designs.backfill',
				'true',
			);

			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const minimalAtlassianDesign =
				figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...minimalAtlassianDesign,
						addAssociations: [
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId,
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(minimalAtlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(minimalAtlassianDesign),
							name: minimalAtlassianDesign.displayName,
						},
					]),
				),
			});
			// Mock endpoints called asynchronously in the background job.
			const fileResponse = generateGetFileResponseWithNode({
				name: fileName,
				node,
			});
			const fileMetaResponse = generateGetFileMetaResponse();
			const atlassianDesign = transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				fileResponse,
				fileMetaResponse,
			});
			mockFigmaGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: {
					ids: nodeId,
					depth: '0',
					node_last_modified: 'true',
				},
				response: fileResponse,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([atlassianDesign]),
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(minimalAtlassianDesign);
			await waitForEvent('job.submit-full-design.succeeded');
			expect(await associatedFigmaDesignRepository.getAll()).toStrictEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey, nodeId),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});

		it('should ingest a minimal Figma file constructed from URL if Figma file is not found', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				mode: 'dev',
			});
			inputFigmaDesignUrl.searchParams.set(
				'com.atlassian.designs.backfill',
				'true',
			);
			const minimalAtlassianDesign =
				figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...minimalAtlassianDesign,
						addAssociations: [
							// Nock does not correctly match a request body when provide an instance of a class
							// (e.g., as `AtlassianAssociation`). Therefore, pass an object instead.
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId: '0:0',
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(minimalAtlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(minimalAtlassianDesign),
							name: minimalAtlassianDesign.displayName,
						},
					]),
				),
			});
			// Mock endpoints called asynchronously in the background job.
			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				status: HttpStatusCode.NotFound,
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(minimalAtlassianDesign);
			await waitForEvent('job.submit-full-design.cancelled');
			expect(await associatedFigmaDesignRepository.getAll()).toStrictEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});

		it('should ingest a minimal Figma node constructed from URL if Figma node is not found', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
				mode: 'dev',
			});
			inputFigmaDesignUrl.searchParams.set(
				'com.atlassian.designs.backfill',
				'true',
			);
			const minimalAtlassianDesign =
				figmaBackfillService.buildMinimalDesignFromUrl(inputFigmaDesignUrl);
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...minimalAtlassianDesign,
						addAssociations: [
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaCreateDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				request: generateCreateDevResourcesRequest({
					name: `[${issue.key}] ${issue.fields.summary}`,
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					fileKey,
					nodeId,
				}),
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
				request: JSON.stringify(
					buildDesignUrlForIssueProperties(minimalAtlassianDesign),
				),
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
							url: buildDesignUrlForIssueProperties(minimalAtlassianDesign),
							name: minimalAtlassianDesign.displayName,
						},
					]),
				),
			});
			// Mock endpoints called asynchronously in the background job.
			const fileResponse = generateGetFileResponseWithNode();
			mockFigmaGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: {
					ids: nodeId,
					depth: '0',
					node_last_modified: 'true',
				},
				response: fileResponse,
			});
			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl.toString(),
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateAssociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(minimalAtlassianDesign);
			await waitForEvent('job.submit-full-design.cancelled');
			expect(await associatedFigmaDesignRepository.getAll()).toStrictEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey, nodeId),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
					inputUrl: inputFigmaDesignUrl.toString(),
				},
			]);
		});
	});

	describe('/disassociateEntity', () => {
		const currentDate = new Date();

		beforeEach(() => {
			jest
				.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
				.setSystemTime(currentDate);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should disassociate Figma file and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const designId = new FigmaDesignIdentifier(fileKey);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
			}).toString();
			const designStub = {
				id: designId.toAtlassianDesignId(),
				displayName: 'Untitled',
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.OTHER,
				lastUpdated: new Date().toISOString(),
				updateSequenceNumber: 0,
			};
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...designStub,
						removeAssociations: [
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
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
				fileKey,
				devResourceId,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: figmaDesignUrl,
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});

			const expectedDesignUrlV2ValueItem = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Value = [
				{ url: figmaDesignUrl, name: designStub.displayName },
				expectedDesignUrlV2ValueItem,
			];
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Value),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([expectedDesignUrlV2ValueItem])),
			});

			await request(app)
				.post('/entities/disassociateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateDisassociateEntityRequest({
						issueId: issue.id,
						issueAri,
						entityId: fileKey,
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateDisassociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(designStub);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([]);
		});

		it('should disassociate Figma node and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const designId = new FigmaDesignIdentifier(fileKey, nodeId);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
			}).toString();
			const designStub = {
				id: designId.toAtlassianDesignId(),
				displayName: 'Untitled',
				url: buildDesignUrl(designId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
				inspectUrl: buildInspectUrl(designId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.OTHER,
				lastUpdated: new Date().toISOString(),
				updateSequenceNumber: 0,
			};
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			await figmaOAuth2UserCredentialsRepository.upsert(
				generateFigmaOAuth2UserCredentialCreateParams({
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
			);
			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
			});

			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
				request: generateSubmitDesignsRequest([
					{
						...designStub,
						removeAssociations: [
							{
								...AtlassianAssociation.createDesignIssueAssociation(issueAri),
							},
						],
					},
				]),
			});
			mockFigmaGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				nodeId,
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
				fileKey,
				devResourceId,
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
					value: figmaDesignUrl,
				}),
			});
			mockJiraDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL,
			});

			const expectedDesignUrlV2ValueItem = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Value = [
				{ url: figmaDesignUrl, name: designStub.displayName },
				expectedDesignUrlV2ValueItem,
			];
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Value),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([expectedDesignUrlV2ValueItem])),
			});

			await request(app)
				.post('/entities/disassociateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateDisassociateEntityRequest({
						issueId: issue.id,
						issueAri,
						entityId: `${fileKey}/${nodeId}`,
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateDisassociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect(designStub);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([]);
		});

		it('should respond with 200 if getDevResource returns no resources', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issue = generateJiraIssue();
			const fileMetaResponse = generateGetFileMetaResponse({ name: fileName });
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockFigmaGetFileMetaEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				response: fileMetaResponse,
			});
			mockJiraGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				response: issue,
			});
			mockJiraSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
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
				fileKey,
				nodeId: '0:0',
				response: generateEmptyDevResourcesResponse(),
			});

			return request(app)
				.post('/entities/disassociateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateDisassociateEntityRequest({
						issueId: issue.id,
						entityId: fileKey,
					}),
				)
				.set(
					'Authorization',
					`JWT ${generateDisassociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok);
		});

		it('should respond with 400 "userId" query parameter is missing', async () => {
			const connectInstallation = await connectInstallationRepository.upsert(
				generateConnectInstallationCreateParams(),
			);
			const jwt = generateJiraServerSymmetricJwtToken({
				request: {
					method: 'POST',
					pathname: '/entities/disassociateEntity',
				},
				connectInstallation,
			});

			return request(app)
				.post('/entities/disassociateEntity')
				.send(generateDisassociateEntityRequest())
				.set('Authorization', `JWT ${jwt}`)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.BadRequest);
		});
	});
});
