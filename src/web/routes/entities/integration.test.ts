import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';
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
	generateFigmaUserCredentialsCreateParams,
	generateJiraIssue,
	generateJiraIssueAri,
	generateJiraIssueId,
	generateJiraIssueUrl,
} from '../../../domain/entities/testing';
import type { GetDevResourcesResponse } from '../../../infrastructure/figma/figma-client';
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
import type { GetIssuePropertyResponse } from '../../../infrastructure/jira/jira-client';
import {
	generateGetIssuePropertyResponse,
	generateGetIssueResponse,
	generateSuccessfulSubmitDesignsResponse,
} from '../../../infrastructure/jira/jira-client/testing';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';

const MOCK_CONNECT_INSTALLATION_CREATE_PARAMS =
	generateConnectInstallationCreateParams({
		key: 'com.figma.jira-addon-dev',
		clientKey: '4561b8be-e38b-43d4-84d9-f09e8195d117',
		sharedSecret: '903b6b9e-b82b-48ea-a9b2-40b9e700df32',
	});
const ASSOCIATE_JWT_TOKEN =
	'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTM5NTcyMDUsImV4cCI6NjAwMDAwMDE2OTM5NTcxNDQsImlzcyI6IjQ1NjFiOGJlLWUzOGItNDNkNC04NGQ5LWYwOWU4MTk1ZDExNyIsInFzaCI6IjQ2ZDE3MDU4OWU0MjM2Y2U0YTQ5MTFlMGQ1YWE4YjdkOWYzZjNlODZlN2E0ZTgzMzFhM2MyNWE5NTI0MWNjMmYifQ.E71S-uGRlVmEY8-iEEj4bl3SiOcDUlJ-36XGoq8tDHE';
const DISASSOCIATE_JWT_TOKEN =
	'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTQ0MzU0NjcsImV4cCI6NjAwMDAwMDE2OTQ0MzU0MDAsImlzcyI6IjQ1NjFiOGJlLWUzOGItNDNkNC04NGQ5LWYwOWU4MTk1ZDExNyIsInFzaCI6ImEzYTcwOGIxNDQwMjdlM2U2ZWRjYWYzY2MzZTBkNzYzYWRhMzI4NDgwMTFjNzMzNGQwMjRkZGE2ZGQ5OWU2NWUifQ.j_Bb4M76LpldZglEY7wQE7KY1KsMIsuvTyqppQd2wBY';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;

const mockMeEndpoint = ({
	success = true,
	times = 1,
}: {
	success?: boolean;
	times?: number;
} = {}) => {
	const statusCode = success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden;
	nock(FIGMA_API_BASE_URL).get('/v1/me').times(times).reply(statusCode);
};

const mockGetFileEndpoint = ({
	fileKey,
	accessToken,
	query = {},
	status = HttpStatusCode.Ok,
	response,
}: {
	fileKey: string;
	accessToken: string;
	query?: Record<string, string>;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(FIGMA_API_BASE_URL, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`/v1/files/${fileKey}`)
		.query(query)
		.reply(status, response ?? {});
};

const mockGetIssueEndpoint = ({
	baseUrl,
	issueId,
	status = HttpStatusCode.Ok,
	response = generateGetIssueResponse({ id: issueId }),
}: {
	baseUrl: string;
	issueId: string;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(baseUrl).get(`/rest/agile/1.0/issue/${issueId}`).reply(status, response);
};

const mockSubmitDesignsEndpoint = ({
	baseUrl,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.post('/rest/designs/1.0/bulk')
		.reply(
			status,
			status === HttpStatusCode.Ok
				? generateSuccessfulSubmitDesignsResponse()
				: {},
		);
};

const mockGetIssuePropertyEndpoint = ({
	baseUrl,
	issueId = generateJiraIssueId(),
	propertyKey = '',
	status = HttpStatusCode.Ok,
	response = generateGetIssuePropertyResponse(),
}: {
	baseUrl: string;
	issueId: string;
	propertyKey: string;
	status?: HttpStatusCode;
	response?: GetIssuePropertyResponse;
}) => {
	nock(baseUrl)
		.get(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`)
		.reply(status, status === HttpStatusCode.Ok ? response : undefined);
};

const mockSetIssuePropertyEndpoint = ({
	baseUrl,
	issueId,
	propertyKey,
	value,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	issueId: string;
	propertyKey: string;
	value: RequestBodyMatcher;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.put(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`, value)
		.reply(status);
};

const mockDeleteIssuePropertyEndpoint = ({
	baseUrl,
	issueId,
	propertyKey,
}: {
	baseUrl: string;
	issueId: string;
	propertyKey?: string;
}) => {
	nock(baseUrl)
		.delete(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`)
		.reply(200);
};

const mockCreateDevResourcesEndpoint = ({
	status = HttpStatusCode.Ok,
}: {
	status?: HttpStatusCode;
} = {}) => {
	nock(FIGMA_API_BASE_URL).post('/v1/dev_resources').reply(status);
};

const mockGetDevResourcesEndpoint = ({
	fileKey,
	nodeId,
	response = generateGetDevResourcesResponse(),
}: {
	fileKey: string;
	nodeId: string;
	response?: GetDevResourcesResponse;
}) => {
	nock(FIGMA_API_BASE_URL)
		.get(`/v1/files/${fileKey}/dev_resources`)
		.query({ node_ids: nodeId })
		.reply(HttpStatusCode.Ok, response);
};

const mockDeleteDevResourcesEndpoint = ({
	fileKey,
	devResourceId,
	status = HttpStatusCode.Ok,
}: {
	fileKey: string;
	devResourceId: string;
	status?: HttpStatusCode;
}) => {
	nock(FIGMA_API_BASE_URL)
		.delete(`/v1/files/${fileKey}/dev_resources/${devResourceId}`)
		.reply(status);
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			mockMeEndpoint({ success: true, times: 2 });
			mockGetFileEndpoint({
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
			mockCreateDevResourcesEndpoint();

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

			const expectedResponse = {
				design: transformFileToAtlassianDesign({
					fileKey,
					fileResponse,
				}),
			};

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
				.expect(expectedResponse);
			expect(
				await associatedFigmaDesignRepository.findByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					new FigmaDesignIdentifier(fileKey),
					issueAri,
					connectInstallation.id,
				),
			).toBeTruthy();
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			mockMeEndpoint({ success: true, times: 2 });
			mockGetFileEndpoint({
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
			mockCreateDevResourcesEndpoint();

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

			const expectedResponse = {
				design: transformNodeToAtlassianDesign({
					fileKey,
					nodeId,
					fileResponse,
				}),
			};

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
				.expect(expectedResponse);
			expect(
				await associatedFigmaDesignRepository.findByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					new FigmaDesignIdentifier(fileKey, nodeId),
					issueAri,
					connectInstallation.id,
				),
			).toBeTruthy();
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			mockMeEndpoint({ success: true, times: 2 });
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockGetFileEndpoint({
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
			});
			mockMeEndpoint({ success: true, times: 2 });
			mockGetFileEndpoint({
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
			mockDeleteDevResourcesEndpoint({ fileKey, devResourceId });
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

			const expectedResponse = {
				design: transformFileToAtlassianDesign({
					fileKey,
					fileResponse,
				}),
			};

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
				.expect(expectedResponse);
			expect(
				await associatedFigmaDesignRepository.findByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					designId,
					issueAri,
					connectInstallation.id,
				),
			).toBeNull();
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			await associatedFigmaDesignRepository.upsert({
				designId,
				associatedWithAri: issueAri,
				connectInstallationId: connectInstallation.id,
			});
			mockMeEndpoint({ success: true, times: 2 });
			mockGetFileEndpoint({
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
			mockDeleteDevResourcesEndpoint({ fileKey, devResourceId });
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

			const expectedResponse = {
				design: transformNodeToAtlassianDesign({
					fileKey,
					nodeId,
					fileResponse,
				}),
			};

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
				.expect(expectedResponse);
			expect(
				await associatedFigmaDesignRepository.findByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					designId,
					issueAri,
					connectInstallation.id,
				),
			).toBeNull();
		});

		it('should respond with 200 if getDevResource returns no resources', async () => {
			const atlassianUserId = uuidv4();
			const fileName = generateFigmaFileName();
			const fileKey = generateFigmaFileKey();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const fileResponse = generateGetFileResponse({ name: fileName });

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			mockMeEndpoint({ success: true, times: 2 });
			mockGetFileEndpoint({
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

			const figmaUserCredentials =
				await figmaOAuth2UserCredentialsRepository.upsert(
					generateFigmaUserCredentialsCreateParams({ atlassianUserId }),
				);
			const connectInstallation = await connectInstallationRepository.upsert(
				MOCK_CONNECT_INSTALLATION_CREATE_PARAMS,
			);

			mockMeEndpoint({ success: true, times: 2 });
			mockGetIssueEndpoint({
				baseUrl: connectInstallation.baseUrl,
				issueId,
			});
			mockGetFileEndpoint({
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
