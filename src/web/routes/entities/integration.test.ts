import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type {
	AssociateEntityRequestParams,
	DisassociateEntityRequestParams,
} from './types';

import app from '../../../app';
import { getConfig } from '../../../config';
import type { FigmaUserCredentialsCreateParams } from '../../../domain/entities';
import { JIRA_ISSUE_ATI } from '../../../domain/entities';
import {
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
	generateFigmaUserCredentialsCreateParams,
	generateIssueAri,
	generateIssueId,
} from '../../../domain/entities/testing';
import type { GetDevResourcesResponse } from '../../../infrastructure/figma/figma-client';
import {
	generateEmptyDevResourcesResponse,
	generateGetDevResourcesResponse,
	generateGetFileResponse,
	generateGetFileResponseWithNode,
	MOCK_CHILD_NODE,
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
	connectInstallationRepository,
	figmaOAuth2UserCredentialsRepository,
} from '../../../infrastructure/repositories';

const MOCK_CLIENT_KEY = '4561b8be-e38b-43d4-84d9-f09e8195d117';
const MOCK_SHARED_SECRET = '903b6b9e-b82b-48ea-a9b2-40b9e700df32';
const MOCK_CONNECT_INSTALLATION = {
	key: 'com.figma.jira-addon-dev',
	clientKey: MOCK_CLIENT_KEY,
	sharedSecret: MOCK_SHARED_SECRET,
	baseUrl: 'https://myjirainstance.atlassian.net',
	displayUrl: 'https://myjirainstance.atlassian.net',
};
const ASSOCIATE_JWT_TOKEN =
	'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTM5NTcyMDUsImV4cCI6NjAwMDAwMDE2OTM5NTcxNDQsImlzcyI6IjQ1NjFiOGJlLWUzOGItNDNkNC04NGQ5LWYwOWU4MTk1ZDExNyIsInFzaCI6IjQ2ZDE3MDU4OWU0MjM2Y2U0YTQ5MTFlMGQ1YWE4YjdkOWYzZjNlODZlN2E0ZTgzMzFhM2MyNWE5NTI0MWNjMmYifQ.E71S-uGRlVmEY8-iEEj4bl3SiOcDUlJ-36XGoq8tDHE';
const DISASSOCIATE_JWT_TOKEN =
	'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTQ0MzU0NjcsImV4cCI6NjAwMDAwMDE2OTQ0MzU0MDAsImlzcyI6IjQ1NjFiOGJlLWUzOGItNDNkNC04NGQ5LWYwOWU4MTk1ZDExNyIsInFzaCI6ImEzYTcwOGIxNDQwMjdlM2U2ZWRjYWYzY2MzZTBkNzYzYWRhMzI4NDgwMTFjNzMzNGQwMjRkZGE2ZGQ5OWU2NWUifQ.j_Bb4M76LpldZglEY7wQE7KY1KsMIsuvTyqppQd2wBY';

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const endpoints = {
	ASSOCIATE_ENTITY: '/entities/associateEntity',
	DISASSOCIATE_ENTITY: '/entities/disassociateEntity',
};

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
	success = true,
	response,
}: {
	fileKey: string;
	accessToken: string;
	query?: Record<string, string>;
	success?: boolean;
	response?: Record<string, unknown>;
}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(FIGMA_API_BASE_URL, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`/v1/files/${fileKey}`)
		.query(query)
		.reply(statusCode, response ?? {});
};

const mockGetIssueEndpoint = ({
	issueId,
	status = HttpStatusCode.Ok,
	response = generateGetIssueResponse({ id: issueId }),
}: {
	issueId: string;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.get(`/rest/agile/1.0/issue/${issueId}`)
		.reply(status, response);
};

const mockSubmitDesignsEndpoint = ({
	status = HttpStatusCode.Ok,
}: {
	status?: HttpStatusCode;
} = {}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.post('/rest/designs/1.0/bulk')
		.reply(
			status,
			status === HttpStatusCode.Ok
				? generateSuccessfulSubmitDesignsResponse()
				: {},
		);
};

const mockGetIssuePropertyEndpoint = ({
	issueId = generateIssueId(),
	propertyKey = '',
	status = HttpStatusCode.Ok,
	response = generateGetIssuePropertyResponse(),
}: {
	issueId: string;
	propertyKey: string;
	status?: HttpStatusCode;
	response?: GetIssuePropertyResponse;
}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.get(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`)
		.reply(status, status === HttpStatusCode.Ok ? response : undefined);
};

const mockSetIssuePropertyEndpoint = ({
	issueId,
	propertyKey,
	value,
	status = HttpStatusCode.Ok,
}: {
	issueId: string;
	propertyKey: string;
	value: RequestBodyMatcher;
	status?: HttpStatusCode;
}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.put(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`, value)
		.reply(status);
};

const mockDeleteIssuePropertyEndpoint = ({
	issueId,
	propertyKey,
}: {
	issueId: string;
	propertyKey?: string;
}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
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
	issueId = generateIssueId(),
	figmaDesignUrl = generateFigmaDesignUrl(),
}: {
	issueId?: string;
	figmaDesignUrl?: string;
} = {}): AssociateEntityRequestParams => ({
	entity: {
		url: figmaDesignUrl,
	},
	associateWith: {
		ati: JIRA_ISSUE_ATI,
		ari: generateIssueAri(issueId),
		cloudId: uuidv4(),
		id: issueId,
	},
});

const generateDisassociateEntityRequest = ({
	issueId = generateIssueId(),
	entityId = generateFigmaFileKey(),
}: {
	issueId?: string;
	entityId?: string;
} = {}): DisassociateEntityRequestParams => ({
	entity: {
		ari: 'TODO',
		id: entityId,
	},
	disassociateFrom: {
		ati: JIRA_ISSUE_ATI,
		ari: generateIssueAri(issueId),
		cloudId: uuidv4(),
		id: issueId,
	},
});

const setupSuccessCaseTests = async (
	validCredentialsParams: FigmaUserCredentialsCreateParams,
) => {
	await figmaOAuth2UserCredentialsRepository.upsert(validCredentialsParams);
	await connectInstallationRepository.upsert(MOCK_CONNECT_INSTALLATION);
};

const cleanupSuccessCaseTests = async (
	validCredentialsParams: FigmaUserCredentialsCreateParams,
) => {
	await connectInstallationRepository
		.deleteByClientKey(MOCK_CLIENT_KEY)
		.catch(console.log);
	await figmaOAuth2UserCredentialsRepository
		.delete(validCredentialsParams.atlassianUserId)
		.catch(console.log);
};

const setupErrorCaseTests = async () => {
	await connectInstallationRepository.upsert(MOCK_CONNECT_INSTALLATION);
};

const cleanupErrorCaseTests = async () => {
	await connectInstallationRepository
		.deleteByClientKey(MOCK_CLIENT_KEY)
		.catch(console.log);
};

describe('/entities', () => {
	let validCredentialsParams: FigmaUserCredentialsCreateParams;

	beforeEach(() => {
		validCredentialsParams = generateFigmaUserCredentialsCreateParams();
	});

	describe('/associateEntity', () => {
		describe('success cases', () => {
			beforeEach(async () => {
				await setupSuccessCaseTests(validCredentialsParams);
			});

			afterEach(async () => {
				await cleanupSuccessCaseTests(validCredentialsParams);
			});

			it('should associate Figma file and respond with created design entity', async () => {
				const fileName = generateFigmaFileName();
				const fileKey = generateFigmaFileKey();
				const issueId = generateIssueId();
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
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileEndpoint({
					fileKey,
					accessToken: credentials?.accessToken,
					query: { depth: '1' },
					response: fileResponse,
				});
				mockGetIssueEndpoint({
					issueId,
				});
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint();

				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					status: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					value: JSON.stringify(normalizedFigmaDesignUrl),
				});
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					status: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
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

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(
						generateAssociateEntityRequest({
							issueId,
							figmaDesignUrl: inputFigmaDesignUrl,
						}),
					)
					.set('Authorization', ASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Ok)
					.expect(expectedResponse);
			});

			it('should associate Figma node and respond with created design entity', async () => {
				const fileName = generateFigmaFileName();
				const fileKey = generateFigmaFileKey();
				const nodeId = generateFigmaNodeId();
				const node = { ...MOCK_CHILD_NODE, id: nodeId };
				const issueId = generateIssueId();
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
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileEndpoint({
					fileKey,
					accessToken: credentials?.accessToken,
					query: {
						ids: nodeId,
						node_last_modified: 'true',
					},
					response: fileResponse,
				});
				mockGetIssueEndpoint({
					issueId,
				});
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint();

				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					status: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					value: JSON.stringify(normalizedFigmaDesignUrl),
				});
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					status: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
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
						fileResponseWithNode: fileResponse,
					}),
				};

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(
						generateAssociateEntityRequest({
							issueId,
							figmaDesignUrl: inputFigmaDesignUrl,
						}),
					)
					.set('Authorization', ASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Ok)
					.expect(expectedResponse);
			});
		});

		describe('error cases', () => {
			beforeEach(async () => {
				await setupErrorCaseTests();
			});

			afterEach(async () => {
				await cleanupErrorCaseTests();
			});

			it('should respond with 401 "User-Id" header is not set', () => {
				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(generateAssociateEntityRequest())
					.set('Authorization', ASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.expect(HttpStatusCode.Unauthorized);
			});

			it('should respond with 403 if credentials are not found', () => {
				const issueId = generateIssueId();
				mockGetIssueEndpoint({ issueId });

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(generateAssociateEntityRequest({ issueId }))
					.set('Authorization', ASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Forbidden);
			});

			describe('with valid auth and upstream errors', () => {
				beforeEach(async () => {
					await figmaOAuth2UserCredentialsRepository.upsert(
						validCredentialsParams,
					);
				});

				afterEach(async () => {
					await figmaOAuth2UserCredentialsRepository
						.delete(validCredentialsParams.atlassianUserId)
						.catch(console.log);
				});

				it('should respond with 500 if fetching design details fails', async () => {
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const figmaDesignUrl = generateFigmaDesignUrl({
						fileKey,
					});
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true });
					mockGetIssueEndpoint({ issueId });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						success: false,
					});

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(
							generateAssociateEntityRequest({
								issueId,
								figmaDesignUrl,
							}),
						)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if fetching issue details fails', async () => {
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const figmaDesignUrl = generateFigmaDesignUrl({ fileKey });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
					});
					mockMeEndpoint();
					mockGetIssueEndpoint({
						issueId,
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(
							generateAssociateEntityRequest({
								issueId,
								figmaDesignUrl,
							}),
						)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if design ingestion fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const figmaDesignUrl = generateFigmaDesignUrl({ fileKey, fileName });
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: JSON.stringify([]),
						}),
					});
					mockSetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(
							JSON.stringify([
								{ url: figmaDesignUrl, name: fileResponse.name },
							]),
						),
					});
					mockCreateDevResourcesEndpoint();
					mockSubmitDesignsEndpoint({
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(
							generateAssociateEntityRequest({
								issueId,
								figmaDesignUrl,
							}),
						)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if createDevResource request fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const figmaDesignUrl = generateFigmaDesignUrl({ fileKey, fileName });
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: JSON.stringify([]),
						}),
					});
					mockSetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(
							JSON.stringify([
								{ url: figmaDesignUrl, name: fileResponse.name },
							]),
						),
					});
					mockSubmitDesignsEndpoint();
					mockCreateDevResourcesEndpoint({
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(
							generateAssociateEntityRequest({
								issueId,
								figmaDesignUrl,
							}),
						)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if setting any attached-design-url property fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const figmaDesignUrl = generateFigmaDesignUrl({ fileKey, fileName });
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						status: HttpStatusCode.InternalServerError,
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: JSON.stringify([]),
						}),
					});
					mockSetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(
							JSON.stringify([
								{ url: figmaDesignUrl, name: fileResponse.name },
							]),
						),
					});
					mockSubmitDesignsEndpoint();
					mockCreateDevResourcesEndpoint();

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(
							generateAssociateEntityRequest({
								issueId,
								figmaDesignUrl,
							}),
						)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});
			});
		});
	});

	describe('/disassociateEntity', () => {
		describe('success cases', () => {
			beforeEach(async () => {
				await setupSuccessCaseTests(validCredentialsParams);
			});

			afterEach(async () => {
				await cleanupSuccessCaseTests(validCredentialsParams);
			});

			it('should disassociate Figma file and respond with created design entity', async () => {
				const fileName = generateFigmaFileName();
				const fileKey = generateFigmaFileKey();
				const issueId = generateIssueId();
				const devResourceId = uuidv4();
				const figmaDesignUrl = generateFigmaDesignUrl({
					fileKey,
					fileName,
				});
				const fileResponse = generateGetFileResponse({
					name: fileName,
				});
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileEndpoint({
					fileKey,
					accessToken: credentials?.accessToken,
					query: { depth: '1' },
					response: fileResponse,
				});
				mockGetIssueEndpoint({ issueId });
				mockSubmitDesignsEndpoint();
				mockGetDevResourcesEndpoint({
					fileKey,
					nodeId: '0:0',
					response: generateGetDevResourcesResponse({ id: devResourceId }),
				});
				mockDeleteDevResourcesEndpoint({ fileKey, devResourceId });
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL,
						value: figmaDesignUrl,
					}),
				});
				mockDeleteIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				});

				const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue =
					{
						url: 'https://should-not-be-deleted.com',
						name: 'should not be deleted',
					};
				const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
					[
						{ url: figmaDesignUrl, name: fileResponse.name },
						expectedDesignUrlV2Value,
					];
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(attachedDesignUrlV2Values),
					}),
				});
				mockSetIssuePropertyEndpoint({
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

				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(
						generateDisassociateEntityRequest({
							issueId,
							entityId: fileKey,
						}),
					)
					.set('Authorization', DISASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Ok)
					.expect(expectedResponse);
			});

			it('should disassociate Figma node and respond with created design entity', async () => {
				const fileName = generateFigmaFileName();
				const fileKey = generateFigmaFileKey();
				const nodeId = generateFigmaNodeId();
				const node = { ...MOCK_CHILD_NODE, id: nodeId };
				const issueId = generateIssueId();
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
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileEndpoint({
					fileKey,
					accessToken: credentials?.accessToken,
					query: { ids: nodeId, node_last_modified: 'true' },
					response: fileResponse,
				});
				mockGetIssueEndpoint({ issueId });
				mockSubmitDesignsEndpoint();
				mockGetDevResourcesEndpoint({
					fileKey,
					nodeId,
					response: generateGetDevResourcesResponse({ id: devResourceId }),
				});
				mockDeleteDevResourcesEndpoint({ fileKey, devResourceId });
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL,
						value: figmaDesignUrl,
					}),
				});
				mockDeleteIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				});

				const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue =
					{
						url: 'https://should-not-be-deleted.com',
						name: 'should not be deleted',
					};
				const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
					[
						{ url: figmaDesignUrl, name: fileResponse.name },
						expectedDesignUrlV2Value,
					];
				mockGetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(attachedDesignUrlV2Values),
					}),
				});
				mockSetIssuePropertyEndpoint({
					issueId,
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(JSON.stringify([expectedDesignUrlV2Value])),
				});

				const expectedResponse = {
					design: transformNodeToAtlassianDesign({
						fileKey,
						nodeId,
						fileResponseWithNode: fileResponse,
					}),
				};

				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(
						generateDisassociateEntityRequest({
							issueId,
							entityId: `${fileKey}/${nodeId}`,
						}),
					)
					.set('Authorization', DISASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Ok)
					.expect(expectedResponse);
			});
		});

		describe('error cases', () => {
			beforeEach(async () => {
				await setupErrorCaseTests();
			});

			afterEach(async () => {
				await cleanupErrorCaseTests();
			});

			it('should respond with 401 "User-Id" header is not set', () => {
				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(generateDisassociateEntityRequest())
					.set('Authorization', DISASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.expect(HttpStatusCode.Unauthorized);
			});

			it('should respond with 403 if credentials are not found', () => {
				const issueId = generateIssueId();
				mockGetIssueEndpoint({ issueId });

				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(generateDisassociateEntityRequest({ issueId }))
					.set('Authorization', DISASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.Forbidden);
			});

			describe('with valid auth and upstream errors', () => {
				beforeEach(async () => {
					await figmaOAuth2UserCredentialsRepository.upsert(
						validCredentialsParams,
					);
				});

				afterEach(async () => {
					await figmaOAuth2UserCredentialsRepository
						.delete(validCredentialsParams.atlassianUserId)
						.catch(console.log);
				});

				it('should respond with 500 if fetching design details fails', async () => {
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true });
					mockGetIssueEndpoint({ issueId });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						success: false,
					});

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(
							generateDisassociateEntityRequest({
								issueId,
								entityId: fileKey,
							}),
						)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if fetching issue details fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockMeEndpoint();
					mockGetIssueEndpoint({
						issueId,
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(
							generateDisassociateEntityRequest({
								issueId,
								entityId: fileKey,
							}),
						)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if design ingestion fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockGetDevResourcesEndpoint({
						fileKey,
						nodeId: '0:0',
						response: generateEmptyDevResourcesResponse(),
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						status: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						status: HttpStatusCode.NotFound,
					});
					mockSubmitDesignsEndpoint({
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(
							generateDisassociateEntityRequest({
								issueId,
								entityId: fileKey,
							}),
						)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 200 if getDevResource returns no resources', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const fileResponse = generateGetFileResponse({ name: fileName });
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockSubmitDesignsEndpoint();
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						status: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
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
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(
							generateDisassociateEntityRequest({
								issueId,
								entityId: fileKey,
							}),
						)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.Ok);
				});

				it('should respond with 500 if deleteDevResource request fails', async () => {
					const fileName = generateFigmaFileName();
					const fileKey = generateFigmaFileKey();
					const issueId = generateIssueId();
					const fileResponse = generateGetFileResponse({ name: fileName });
					const devResourceId = uuidv4();
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileEndpoint({
						fileKey,
						accessToken: credentials?.accessToken,
						query: { depth: '1' },
						response: fileResponse,
					});
					mockGetIssueEndpoint({ issueId });
					mockSubmitDesignsEndpoint();
					mockGetDevResourcesEndpoint({
						fileKey,
						nodeId: '0:0',
						response: generateGetDevResourcesResponse({ id: devResourceId }),
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						status: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
						issueId,
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						status: HttpStatusCode.NotFound,
					});
					mockDeleteDevResourcesEndpoint({
						fileKey,
						devResourceId,
						status: HttpStatusCode.InternalServerError,
					});

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(
							generateDisassociateEntityRequest({
								issueId,
								entityId: fileKey,
							}),
						)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});
			});
		});
	});
});
