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
import type {
	AtlassianDesign,
	FigmaUserCredentialsCreateParams,
} from '../../../domain/entities';
import { JIRA_ISSUE_ATI } from '../../../domain/entities';
import {
	generateFigmaDesignUrl,
	generateFigmaUserCredentialsCreateParams,
	generateIssueAri,
	MOCK_ISSUE_ID,
} from '../../../domain/entities/testing';
import type { FileNodesResponse } from '../../../infrastructure/figma/figma-client';
import { transformNodeToAtlassianDesign } from '../../../infrastructure/figma/figma-transformer';
import {
	generateEmptyDevResourcesResponse,
	generateGetDevResourcesResponse,
	generateGetFileNodesResponse,
	MOCK_DEV_RESOURCE_ID,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
} from '../../../infrastructure/figma/testing';
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

const endpoints = {
	figma: {
		API_BASE_URL: getConfig().figma.apiBaseUrl,
		ME: '/v1/me',
		FILE_NODES: '/v1/files',
		DEV_RESOURCES: '/v1/dev_resources',
	},
	jira: {
		ISSUE: '/rest/agile/1.0/issue',
		INGEST_DESIGN: '/rest/designs/1.0/bulk',
		ISSUE_PROPERTY: '/rest/api/2/issue',
	},
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
	nock(endpoints.figma.API_BASE_URL)
		.get(endpoints.figma.ME)
		.times(times)
		.reply(statusCode);
};

const mockGetFileNodesEndpoint = ({
	accessToken,
	response,
	success = true,
}: {
	accessToken?: string;
	response?: Record<string, unknown>;
	success?: boolean;
}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(endpoints.figma.API_BASE_URL, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`${endpoints.figma.FILE_NODES}/${MOCK_FILE_KEY}/nodes`)
		.query({ ids: MOCK_NODE_ID })
		.reply(statusCode, response ?? {});
};

const mockCreateDevResourcesEndpoint = ({
	success = true,
}: {
	success?: boolean;
} = {}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(endpoints.figma.API_BASE_URL)
		.post(endpoints.figma.DEV_RESOURCES)
		.reply(statusCode);
};

const mockGetIssueEndpoint = ({
	success = true,
}: { success?: boolean } = {}) => {
	const issue = generateGetIssueResponse({ id: MOCK_ISSUE_ID });
	const statusCode = success ? HttpStatusCode.Ok : HttpStatusCode.NotFound;
	const response = success ? issue : {};
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.get(`${endpoints.jira.ISSUE}/${MOCK_ISSUE_ID}`)
		.reply(statusCode, response);
};

const mockSubmitDesignsEndpoint = ({
	success = true,
}: {
	success?: boolean;
} = {}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.post(endpoints.jira.INGEST_DESIGN)
		.reply(
			statusCode,
			success ? generateSuccessfulSubmitDesignsResponse() : {},
		);
};

const mockGetIssuePropertyEndpoint = ({
	propertyKey = '',
	success = true,
	errorCode = HttpStatusCode.InternalServerError,
	response = generateGetIssuePropertyResponse(),
}: {
	propertyKey?: string;
	success?: boolean;
	errorCode?: HttpStatusCode;
	response?: GetIssuePropertyResponse;
} = {}) => {
	const statusCode = success ? HttpStatusCode.Ok : errorCode;
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.get(
			`${endpoints.jira.ISSUE_PROPERTY}/${MOCK_ISSUE_ID}/properties/${propertyKey}`,
		)
		.reply(statusCode, success ? response : undefined);
};

const mockSetIssuePropertyEndpoint = ({
	propertyKey = '',
	success = true,
	errorCode = HttpStatusCode.InternalServerError,
	successCode = HttpStatusCode.Ok,
	value = {},
}: {
	propertyKey?: string;
	success?: boolean;
	errorCode?: HttpStatusCode;
	successCode?: HttpStatusCode;
	value?: RequestBodyMatcher;
} = {}) => {
	const statusCode = success ? successCode : errorCode;
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.put(
			`${endpoints.jira.ISSUE_PROPERTY}/${MOCK_ISSUE_ID}/properties/${propertyKey}`,
			value,
		)
		.reply(statusCode);
};

const mockDeleteIssuePropertyEndpoint = ({
	propertyKey,
}: { propertyKey?: string } = {}) => {
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.delete(
			`${endpoints.jira.ISSUE_PROPERTY}/${MOCK_ISSUE_ID}/properties/${propertyKey}`,
		)
		.reply(200);
};

const mockGetDevResourcesEndpoint = ({
	withDevResources = true,
}: { withDevResources?: boolean } = {}) => {
	const response = withDevResources
		? generateGetDevResourcesResponse()
		: generateEmptyDevResourcesResponse();
	nock(endpoints.figma.API_BASE_URL)
		.get(`${endpoints.figma.FILE_NODES}/${MOCK_FILE_KEY}/dev_resources`)
		.query({ node_ids: MOCK_NODE_ID })
		.reply(HttpStatusCode.Ok, response);
};

const mockDeleteDevResourcesEndpoint = ({
	success = true,
}: {
	success?: boolean;
} = {}) => {
	const statusCode = success ? HttpStatusCode.Ok : HttpStatusCode.NotFound;
	nock(endpoints.figma.API_BASE_URL)
		.delete(
			`${endpoints.figma.FILE_NODES}/${MOCK_FILE_KEY}/dev_resources/${MOCK_DEV_RESOURCE_ID}`,
		)
		.reply(statusCode);
};

const MOCK_ASSOCIATE_REQUEST: AssociateEntityRequestParams = {
	entity: {
		url: generateFigmaDesignUrl({
			fileKey: MOCK_FILE_KEY,
			nodeId: MOCK_NODE_ID,
		}),
	},
	associateWith: {
		ati: JIRA_ISSUE_ATI,
		ari: generateIssueAri(MOCK_ISSUE_ID),
		cloudId: uuidv4(),
		id: MOCK_ISSUE_ID,
	},
};

const MOCK_DISASSOCIATE_REQUEST: DisassociateEntityRequestParams = {
	entity: {
		ari: 'TODO',
		id: `${MOCK_FILE_KEY}/${MOCK_NODE_ID}`,
	},
	disassociateFrom: {
		ati: JIRA_ISSUE_ATI,
		ari: generateIssueAri(MOCK_ISSUE_ID),
		cloudId: uuidv4(),
		id: MOCK_ISSUE_ID,
	},
};

const getMockDesignFromFileNodesResponse = (
	fileNodesResponse: FileNodesResponse,
): AtlassianDesign =>
	transformNodeToAtlassianDesign({
		fileKey: MOCK_FILE_KEY,
		nodeId: MOCK_NODE_ID,
		fileNodesResponse,
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

			it('should respond with created design entity', async () => {
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);
				const mockFileNodesResponse = generateGetFileNodesResponse();
				const mockDesign = getMockDesignFromFileNodesResponse(
					mockFileNodesResponse,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileNodesEndpoint({
					accessToken: credentials?.accessToken,
					response: mockFileNodesResponse,
				});
				mockGetIssueEndpoint();
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint();

				mockGetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					success: false,
					errorCode: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					value: JSON.stringify(mockDesign.url),
				});

				mockGetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					success: false,
					errorCode: HttpStatusCode.NotFound,
				});
				mockSetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: [{ url: mockDesign.url, name: mockDesign.displayName }],
				});

				const expectedResponse = {
					design: transformNodeToAtlassianDesign({
						fileKey: MOCK_FILE_KEY,
						nodeId: MOCK_NODE_ID,
						fileNodesResponse: mockFileNodesResponse,
					}),
				};

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_ASSOCIATE_REQUEST)
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
					.send(MOCK_ASSOCIATE_REQUEST)
					.set('Authorization', ASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.expect(HttpStatusCode.Unauthorized);
			});

			it('should respond with 403 if credentials are not found', () => {
				mockGetIssueEndpoint();

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_ASSOCIATE_REQUEST)
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
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true });
					mockGetIssueEndpoint();
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						success: false,
					});

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(MOCK_ASSOCIATE_REQUEST)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if fetching issue details fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
					});
					mockMeEndpoint();
					mockGetIssueEndpoint({ success: false });

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(MOCK_ASSOCIATE_REQUEST)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if design ingestion fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();
					const mockDesign = getMockDesignFromFileNodesResponse(
						mockFileNodesResponse,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					});

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: [],
						}),
					});
					mockSetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: [{ url: mockDesign.url, name: mockDesign.displayName }],
					});

					mockCreateDevResourcesEndpoint();
					mockSubmitDesignsEndpoint({ success: false });

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(MOCK_ASSOCIATE_REQUEST)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if createDevResource request fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();
					const mockDesign = getMockDesignFromFileNodesResponse(
						mockFileNodesResponse,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					});

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: [],
						}),
					});
					mockSetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: [{ url: mockDesign.url, name: mockDesign.displayName }],
					});

					mockSubmitDesignsEndpoint();
					mockCreateDevResourcesEndpoint({ success: false });

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(MOCK_ASSOCIATE_REQUEST)
						.set('Authorization', ASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if setting any attached-design-url property fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();
					const mockDesign = getMockDesignFromFileNodesResponse(
						mockFileNodesResponse,
					);

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						success: false,
					});

					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						response: generateGetIssuePropertyResponse({
							key: propertyKeys.ATTACHED_DESIGN_URL_V2,
							value: [],
						}),
					});
					mockSetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: [{ url: mockDesign.url, name: mockDesign.displayName }],
					});

					mockSubmitDesignsEndpoint();
					mockCreateDevResourcesEndpoint();

					return request(app)
						.post(endpoints.ASSOCIATE_ENTITY)
						.send(MOCK_ASSOCIATE_REQUEST)
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

			it('should respond with created design entity', async () => {
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);
				const mockFileNodesResponse = generateGetFileNodesResponse();
				const mockDesign = getMockDesignFromFileNodesResponse(
					mockFileNodesResponse,
				);

				mockMeEndpoint({ success: true, times: 2 });
				mockGetFileNodesEndpoint({
					accessToken: credentials?.accessToken,
					response: mockFileNodesResponse,
				});

				mockGetIssueEndpoint();
				mockSubmitDesignsEndpoint();
				mockGetDevResourcesEndpoint();

				mockDeleteDevResourcesEndpoint();

				mockGetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL,
						value: mockDesign.url,
					}),
				});
				mockDeleteIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
				});

				const expectedDesignUrlV2Value: AttachedDesignUrlV2IssuePropertyValue =
					{
						url: 'https://should-not-be-deleted.com',
						name: 'should not be deleted',
					};
				const attachedDesignUrlV2Values: AttachedDesignUrlV2IssuePropertyValue[] =
					[
						{ url: mockDesign.url, name: mockDesign.displayName },
						expectedDesignUrlV2Value,
					];
				mockGetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					response: generateGetIssuePropertyResponse({
						key: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: attachedDesignUrlV2Values,
					}),
				});
				mockSetIssuePropertyEndpoint({
					propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: [expectedDesignUrlV2Value],
				});

				const expectedResponse = {
					design: transformNodeToAtlassianDesign({
						fileKey: MOCK_FILE_KEY,
						nodeId: MOCK_NODE_ID,
						fileNodesResponse: mockFileNodesResponse,
					}),
				};

				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(MOCK_DISASSOCIATE_REQUEST)
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
					.send(MOCK_DISASSOCIATE_REQUEST)
					.set('Authorization', DISASSOCIATE_JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.expect(HttpStatusCode.Unauthorized);
			});

			it('should respond with 403 if credentials are not found', () => {
				mockGetIssueEndpoint();

				return request(app)
					.post(endpoints.DISASSOCIATE_ENTITY)
					.send(MOCK_DISASSOCIATE_REQUEST)
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
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);

					mockMeEndpoint({ success: true });
					mockGetIssueEndpoint();
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						success: false,
					});

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(MOCK_DISASSOCIATE_REQUEST)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if fetching issue details fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
					});
					mockMeEndpoint();
					mockGetIssueEndpoint({ success: false });

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(MOCK_DISASSOCIATE_REQUEST)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 500 if design ingestion fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();
					mockGetDevResourcesEndpoint();
					mockDeleteDevResourcesEndpoint();
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockSubmitDesignsEndpoint({ success: false });

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(MOCK_DISASSOCIATE_REQUEST)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});

				it('should respond with 200 if getDevResource returns no resources', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();
					mockSubmitDesignsEndpoint();
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockGetDevResourcesEndpoint({ withDevResources: false });

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(MOCK_DISASSOCIATE_REQUEST)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.Ok);
				});

				it('should respond with 500 if deleteDevResource request fails', async () => {
					const credentials = await figmaOAuth2UserCredentialsRepository.get(
						validCredentialsParams.atlassianUserId,
					);
					const mockFileNodesResponse = generateGetFileNodesResponse();

					mockMeEndpoint({ success: true, times: 2 });
					mockGetFileNodesEndpoint({
						accessToken: credentials?.accessToken,
						response: mockFileNodesResponse,
					});
					mockGetIssueEndpoint();
					mockSubmitDesignsEndpoint();
					mockGetDevResourcesEndpoint();
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockGetIssuePropertyEndpoint({
						propertyKey: propertyKeys.ATTACHED_DESIGN_URL_V2,
						success: false,
						errorCode: HttpStatusCode.NotFound,
					});
					mockDeleteDevResourcesEndpoint({ success: false });

					return request(app)
						.post(endpoints.DISASSOCIATE_ENTITY)
						.send(MOCK_DISASSOCIATE_REQUEST)
						.set('Authorization', DISASSOCIATE_JWT_TOKEN)
						.set('Content-Type', 'application/json')
						.set('User-Id', validCredentialsParams.atlassianUserId)
						.expect(HttpStatusCode.InternalServerError);
				});
			});
		});
	});
});
