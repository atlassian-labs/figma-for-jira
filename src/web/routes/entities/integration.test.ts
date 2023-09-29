import { HttpStatusCode } from 'axios';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type {
	AssociateEntityRequestBody,
	DisassociateEntityRequestBody,
} from './types';

import app from '../../../app';
import { getConfig } from '../../../config';
import {
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
	generateEmptyDevResourcesResponse,
	generateGetDevResourcesResponse,
	generateGetFileResponse,
	generateGetFileResponseWithNode,
} from '../../../infrastructure/figma/figma-client/testing';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from '../../../infrastructure/figma/transformers';
import type { AttachedDesignUrlV2IssuePropertyValue } from '../../../infrastructure/jira';
import { propertyKeys } from '../../../infrastructure/jira';
import { generateGetIssuePropertyResponse } from '../../../infrastructure/jira/jira-client/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';
import {
	generateInboundRequestSymmetricJwtToken,
	mockCreateDevResourcesEndpoint,
	mockDeleteDevResourcesEndpoint,
	mockDeleteIssuePropertyEndpoint,
	mockGetDevResourcesEndpoint,
	mockGetFileEndpoint,
	mockGetIssueEndpoint,
	mockGetIssuePropertyEndpoint,
	mockMeEndpoint,
	mockSetIssuePropertyEndpoint,
	mockSubmitDesignsEndpoint,
} from '../../testing';

const MOCK_CONNECT_INSTALLATION_CREATE_PARAMS =
	generateConnectInstallationCreateParams({
		key: 'com.figma.jira-addon-dev',
		clientKey: uuidv4(),
		sharedSecret: uuidv4(),
	});

const ASSOCIATE_JWT_TOKEN = `JWT ${generateInboundRequestSymmetricJwtToken({
	pathname: '/entities/associateEntity',
	method: 'POST',
	connectInstallation: MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
})}`;

const DISASSOCIATE_JWT_TOKEN = `JWT ${generateInboundRequestSymmetricJwtToken({
	pathname: '/entities/disassociateEntity',
	method: 'POST',
	connectInstallation: MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
})}`;

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
		it('should associate Figma file and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
				mode: 'dev',
			});
			const normalizedFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
			});
			const fileResponse = generateGetFileResponse({
				name: fileName,
			});
			const atlassianDesign = transformFileToAtlassianDesign({
				fileKey,
				fileResponse,
			});
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { depth: '1' },
				response: fileResponse,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
			});
			mockCreateDevResourcesEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				value: JSON.stringify(normalizedFigmaDesignUrl),
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				value: JSON.stringify(
					JSON.stringify([
						{
							url: normalizedFigmaDesignUrl,
							name: fileName,
						},
					]),
				),
			});

			await request(app)
				.post('/entities/associateEntity')
				.send(
					generateAssociateEntityRequest({
						issueId,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl,
					}),
				)
				.set('Authorization', ASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect({ design: atlassianDesign });
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
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const inputFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
				nodeId,
				mode: 'dev',
			});
			const normalizedFigmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
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
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: {
					ids: nodeId,
					node_last_modified: 'true',
				},
				response: fileResponse,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
			});
			mockCreateDevResourcesEndpoint({ baseUrl: getConfig().figma.apiBaseUrl });

			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				value: JSON.stringify(normalizedFigmaDesignUrl),
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				value: JSON.stringify(
					JSON.stringify([
						{
							url: normalizedFigmaDesignUrl,
							name: node.name,
						},
					]),
				),
			});

			await request(app)
				.post('/entities/associateEntity')
				.send(
					generateAssociateEntityRequest({
						issueId,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl,
					}),
				)
				.set('Authorization', ASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect({ design: atlassianDesign });
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([
				{
					id: expect.anything(),
					designId: new FigmaDesignIdentifier(fileKey, nodeId),
					associatedWithAri: issueAri,
					connectInstallationId: connectInstallation.id,
				},
			]);
		});

		it('should respond with 401 "User-Id" header is not set', () => {
			return request(app)
				.post('/entities/associateEntity')
				.send(generateAssociateEntityRequest())
				.set('Authorization', ASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond with 403 if credentials are not found', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});

			return request(app)
				.post('/entities/associateEntity')
				.send(generateAssociateEntityRequest({ issueId }))
				.set('Authorization', ASSOCIATE_JWT_TOKEN)
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
				fileName: generateFigmaFileName(),
				mode: 'dev',
			});

			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { depth: '1' },
				status: HttpStatusCode.InternalServerError,
			});

			await request(app)
				.post('/entities/associateEntity')
				.send(
					generateAssociateEntityRequest({
						issueId,
						issueAri,
						figmaDesignUrl: inputFigmaDesignUrl,
					}),
				)
				.set('Authorization', ASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId);
		});
	});

	describe('/disassociateEntity', () => {
		it('should disassociate Figma file and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const designId = new FigmaDesignIdentifier(fileKey);
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const issue = generateJiraIssue({ id: issueId });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
			});
			const fileResponse = generateGetFileResponse({
				name: fileName,
			});
			const atlassianDesign = transformFileToAtlassianDesign({
				fileKey,
				fileResponse,
			});
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
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
			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { depth: '1' },
				response: fileResponse,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				response: issue,
			});
			mockSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
			});
			mockGetDevResourcesEndpoint({
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
			mockDeleteDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				devResourceId,
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL,
					value: figmaDesignUrl,
				}),
			});
			mockDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
			});

			const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{ url: figmaDesignUrl, name: fileResponse.name },
					expectedDesignUrlV2Value,
				];
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Values),
				}),
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				value: JSON.stringify(JSON.stringify([expectedDesignUrlV2Value])),
			});

			await request(app)
				.post('/entities/disassociateEntity')
				.send(
					generateDisassociateEntityRequest({
						issueId,
						issueAri,
						entityId: fileKey,
					}),
				)
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect({ design: atlassianDesign });
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([]);
		});

		it('should disassociate Figma node and respond with created design entity', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const designId = new FigmaDesignIdentifier(fileKey, nodeId);
			const issueId = generateJiraIssueId();
			const issueAri = generateJiraIssueAri({ issueId });
			const issue = generateJiraIssue({ id: issueId });
			const devResourceId = uuidv4();
			const figmaDesignUrl = generateFigmaDesignUrl({
				fileKey,
				fileName,
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
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
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

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { ids: nodeId, node_last_modified: 'true' },
				response: fileResponse,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				response: issue,
			});
			mockSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
			});
			mockGetDevResourcesEndpoint({
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
			mockDeleteDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				devResourceId,
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				response: generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL,
					value: figmaDesignUrl,
				}),
			});
			mockDeleteIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
			});

			const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue = {
				url: 'https://should-not-be-deleted.com',
				name: 'should not be deleted',
			};
			const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{ url: figmaDesignUrl, name: fileResponse.name },
					expectedDesignUrlV2Value,
				];
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				response: generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignUrlV2Values),
				}),
			});
			mockSetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				value: JSON.stringify(JSON.stringify([expectedDesignUrlV2Value])),
			});

			await request(app)
				.post('/entities/disassociateEntity')
				.send(
					generateDisassociateEntityRequest({
						issueId,
						issueAri,
						entityId: `${fileKey}/${nodeId}`,
					}),
				)
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok)
				.expect({ design: atlassianDesign });
			expect(await associatedFigmaDesignRepository.getAll()).toEqual([]);
		});

		it('should respond with 200 if getDevResource returns no resources', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const fileResponse = generateGetFileResponse({ name: fileName });
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { depth: '1' },
				response: fileResponse,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				response: issue,
			});
			mockSubmitDesignsEndpoint({
				baseUrl: connectInstallation.baseUrl,
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				status: HttpStatusCode.NotFound,
			});
			mockGetIssuePropertyEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
				propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
				status: HttpStatusCode.NotFound,
			});
			mockGetDevResourcesEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				nodeId: '0:0',
				response: generateEmptyDevResourcesResponse(),
			});

			return request(app)
				.post('/entities/disassociateEntity')
				.send(
					generateDisassociateEntityRequest({
						issueId,
						entityId: fileKey,
					}),
				)
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.Ok);
		});

		it('should respond with 401 "User-Id" header is not set', () => {
			return request(app)
				.post('/entities/disassociateEntity')
				.send(generateDisassociateEntityRequest())
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond with 403 if credentials are not found', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});

			return request(app)
				.post('/entities/disassociateEntity')
				.send(generateDisassociateEntityRequest({ issueId }))
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', uuidv4())
				.expect(HttpStatusCode.Forbidden);
		});

		it('should respond with 500 if design fetching fails', async () => {
			const atlassianUserId = uuidv4();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();

			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);
			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaOAuth2UserCredentialCreateParams({
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
				);

			mockMeEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
			});
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockGetFileEndpoint({
				baseUrl: getConfig().figma.apiBaseUrl,
				fileKey,
				accessToken: figmaUserCredentials.accessToken,
				query: { depth: '1' },
				status: HttpStatusCode.InternalServerError,
			});

			return request(app)
				.post('/entities/disassociateEntity')
				.send(generateDisassociateEntityRequest({ entityId: fileKey, issueId }))
				.set('Authorization', DISASSOCIATE_JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', atlassianUserId)
				.expect(HttpStatusCode.InternalServerError);
		});
	});
});
