import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type {
	AssociateEntityRequestBody,
	DisassociateEntityRequestBody,
} from './types';

import app from '../../../app';
import {
	appendToPathname,
	encodeURIComponentAndDash,
} from '../../../common/url-utils';
import { getConfig } from '../../../config';
import type { ConnectInstallation } from '../../../domain/entities';
import {
	AtlassianAssociation,
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
import type { AttachedDesignUrlV2IssuePropertyValue } from '../../../infrastructure/jira';
import { issuePropertyKeys } from '../../../infrastructure/jira';
import {
	generateGetIssuePropertyResponse,
	generateSubmitDesignsRequest,
} from '../../../infrastructure/jira/jira-client/testing';
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
	mockJiraDeleteIssuePropertyEndpoint,
	mockJiraGetIssueEndpoint,
	mockJiraGetIssuePropertyEndpoint,
	mockJiraSetIssuePropertyEndpoint,
	mockJiraSubmitDesignsEndpoint,
} from '../../testing';

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
	figmaDesignUrl = generateFigmaDesignUrl(),
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
			const normalizedFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
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
					appendToPathname(
						new URL(normalizedFigmaDesignUrl),
						encodeURIComponentAndDash(atlassianDesign.displayName),
					).toString(),
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
							url: appendToPathname(
								new URL(normalizedFigmaDesignUrl),
								encodeURIComponentAndDash(atlassianDesign.displayName),
							).toString(),
							name: fileName,
						},
					]),
				),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.INGESTED_DESIGN_URLS,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.INGESTED_DESIGN_URLS,
				request: [normalizedFigmaDesignUrl],
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl,
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
			const normalizedFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
			});
			const fileResponse = generateGetFileResponseWithNode({
				name: fileName,
				node,
			});
			const atlassianDesign = transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				fileResponse,
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
					appendToPathname(
						new URL(normalizedFigmaDesignUrl),
						encodeURIComponent(atlassianDesign.displayName).replaceAll(
							'-',
							'%2D',
						),
					).toString(),
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
							url: appendToPathname(
								new URL(normalizedFigmaDesignUrl),
								encodeURIComponentAndDash(atlassianDesign.displayName),
							).toString(),
							name: atlassianDesign.displayName,
						},
					]),
				),
			});
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.INGESTED_DESIGN_URLS,
				status: HttpStatusCode.NotFound,
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.INGESTED_DESIGN_URLS,
				request: [normalizedFigmaDesignUrl],
			});

			await request(app)
				.post('/entities/associateEntity')
				.query({ userId: atlassianUserId })
				.send(
					generateAssociateEntityRequest({
						issueId: issue.id,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl,
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
					designId: new FigmaDesignIdentifier(fileKey, nodeId),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
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
						figmaDesignUrl: inputFigmaDesignUrl,
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
				.set('User-Id', atlassianUserId);
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
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const designId = new FigmaDesignIdentifier(fileKey);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
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
			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
			});

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

			const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{ url: figmaDesignUrl, name: atlassianDesign.displayName },
					expectedDesignUrlV2Value,
				];
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Values),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([expectedDesignUrlV2Value])),
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
				.expect(atlassianDesign);
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([]);
		});

		it('should disassociate Figma node and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const designId = new FigmaDesignIdentifier(fileKey, nodeId);
			const issue = generateJiraIssue();
			const issueAri = generateJiraIssueAri({ issueId: issue.id });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				nodeId,
			});
			const fileResponse = generateGetFileResponseWithNode({
				name: fileName,
				node,
			});
			const atlassianDesign = transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				fileResponse,
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
			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
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

			const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{ url: figmaDesignUrl, name: atlassianDesign.displayName },
					expectedDesignUrlV2Value,
				];
			mockJiraGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Values),
				}),
			});
			mockJiraSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId: issue.id,
				propertyKey: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				request: JSON.stringify(JSON.stringify([expectedDesignUrlV2Value])),
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
				.expect(atlassianDesign);
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
				.post('/entities/disassociateEntity')
				.query({ userId: atlassianUserId })
				.send(generateDisassociateEntityRequest({ issueId }))
				.set(
					'Authorization',
					`JWT ${generateDisassociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Forbidden);
		});

		it('should respond with 500 if design fetching fails', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();

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

			return request(app)
				.post('/entities/disassociateEntity')
				.query({ userId: atlassianUserId })
				.send(generateDisassociateEntityRequest({ entityId: fileKey, issueId }))
				.set(
					'Authorization',
					`JWT ${generateDisassociateEntityJwt(
						connectInstallation,
						atlassianUserId,
					)}`,
				)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.InternalServerError);
		});
	});
});
