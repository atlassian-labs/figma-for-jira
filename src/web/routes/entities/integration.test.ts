import { HttpStatusCode } from 'axios';
import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { JIRA_ISSUE_ATI } from '../../../common/constants';
import { getConfig } from '../../../config';
import {
	generateFigmaUserCredentialsCreateParams,
	generateIssueAri,
	MOCK_ISSUE_ID,
} from '../../../domain/entities/testing';
import { transformNodeToAtlassianDesign } from '../../../infrastructure/figma/figma-transformer';
import {
	generateGetFileNodesResponse,
	MOCK_DESIGN_URL_WITH_NODE,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
} from '../../../infrastructure/figma/testing';
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

import type { AssociateEntityRequestParams } from '.';

const MOCK_CLIENT_KEY = '4561b8be-e38b-43d4-84d9-f09e8195d117';
const MOCK_SHARED_SECRET = '903b6b9e-b82b-48ea-a9b2-40b9e700df32';
const MOCK_CONNECT_INSTALLATION = {
	key: 'com.figma.jira-addon-dev',
	clientKey: MOCK_CLIENT_KEY,
	sharedSecret: MOCK_SHARED_SECRET,
	baseUrl: 'https://myjirainstance.atlassian.net',
	displayUrl: 'https://myjirainstance.atlassian.net',
};
const JWT_TOKEN =
	'JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE2OTM5NTcyMDUsImV4cCI6NjAwMDAwMDE2OTM5NTcxNDQsImlzcyI6IjQ1NjFiOGJlLWUzOGItNDNkNC04NGQ5LWYwOWU4MTk1ZDExNyIsInFzaCI6IjQ2ZDE3MDU4OWU0MjM2Y2U0YTQ5MTFlMGQ1YWE4YjdkOWYzZjNlODZlN2E0ZTgzMzFhM2MyNWE5NTI0MWNjMmYifQ.E71S-uGRlVmEY8-iEEj4bl3SiOcDUlJ-36XGoq8tDHE';

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
		.query({ ids: MOCK_NODE_ID_URL })
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
}: {
	propertyKey?: string;
	success?: boolean;
	errorCode?: HttpStatusCode;
	successCode?: HttpStatusCode;
} = {}) => {
	const statusCode = success ? successCode : errorCode;
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.put(
			`${endpoints.jira.ISSUE_PROPERTY}/${MOCK_ISSUE_ID}/properties/${propertyKey}`,
		)
		.reply(statusCode);
};

const MOCK_REQUEST: AssociateEntityRequestParams = {
	entity: {
		url: MOCK_DESIGN_URL_WITH_NODE,
	},
	associateWith: {
		ati: JIRA_ISSUE_ATI,
		ari: generateIssueAri(MOCK_ISSUE_ID),
		cloudId: uuidv4(),
		id: MOCK_ISSUE_ID,
	},
};

describe('/associateEntity', () => {
	const validCredentialsParams = generateFigmaUserCredentialsCreateParams();
	describe('success case', () => {
		beforeEach(async () => {
			jest.useFakeTimers({
				doNotFake: ['nextTick'],
			});
			await figmaOAuth2UserCredentialsRepository.upsert(validCredentialsParams);
			await connectInstallationRepository.upsert(MOCK_CONNECT_INSTALLATION);
		});

		afterEach(async () => {
			await connectInstallationRepository
				.deleteByClientKey(MOCK_CLIENT_KEY)
				.catch(console.log);
			await figmaOAuth2UserCredentialsRepository
				.delete(validCredentialsParams.atlassianUserId)
				.catch(console.log);
			jest.runOnlyPendingTimers();
			jest.useRealTimers();
		});

		it('should respond with created design entity', async () => {
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
			mockCreateDevResourcesEndpoint();
			mockGetIssuePropertyEndpoint({
				propertyKey: 'attached-design-url',
				success: false,
				errorCode: HttpStatusCode.NotFound,
			});

			mockSetIssuePropertyEndpoint({
				propertyKey: 'attached-design-url',
			});
			mockGetIssuePropertyEndpoint({
				propertyKey: 'attached-design-url-v2',
				success: false,
				errorCode: HttpStatusCode.NotFound,
			});
			mockSetIssuePropertyEndpoint({
				propertyKey: 'attached-design-url-v2',
			});

			const expectedResponse = {
				design: transformNodeToAtlassianDesign({
					nodeId: MOCK_NODE_ID,
					url: MOCK_DESIGN_URL_WITH_NODE,
					isPrototype: false,
					fileNodesResponse: mockFileNodesResponse,
				}),
			};

			return request(app)
				.post(endpoints.ASSOCIATE_ENTITY)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', validCredentialsParams.atlassianUserId)
				.expect(HttpStatusCode.Created)
				.expect(expectedResponse);
		});
	});

	describe('error scenarios', () => {
		const validCredentialsParams = generateFigmaUserCredentialsCreateParams();

		beforeEach(async () => {
			await connectInstallationRepository.upsert(MOCK_CONNECT_INSTALLATION);
		});

		afterEach(async () => {
			await connectInstallationRepository
				.deleteByClientKey(MOCK_CLIENT_KEY)
				.catch(console.log);
		});

		it('should respond with 401 "User-Id" header is not set', () => {
			return request(app)
				.post(endpoints.ASSOCIATE_ENTITY)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.expect(HttpStatusCode.Unauthorized);
		});

		it('should respond with 403 if credentials are not found', () => {
			mockGetIssueEndpoint();

			return request(app)
				.post(endpoints.ASSOCIATE_ENTITY)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
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
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
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
					success: false,
				});
				mockMeEndpoint();
				mockGetIssueEndpoint({ success: false });

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
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

				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url',
				});
				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url-v2',
				});
				mockCreateDevResourcesEndpoint();
				mockSubmitDesignsEndpoint({ success: false });

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.InternalServerError);
			});

			it('should respond with 500 if createDevResource request fails', async () => {
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

				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url',
				});
				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url-v2',
				});
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint({ success: false });

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.InternalServerError);
			});

			it('should respond with 500 if setting any attached-design-url property fails', async () => {
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

				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url',
					success: false,
				});
				mockGetIssuePropertyEndpoint({
					propertyKey: 'attached-design-url-v2',
				});
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint();

				return request(app)
					.post(endpoints.ASSOCIATE_ENTITY)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(HttpStatusCode.InternalServerError);
			});
		});
	});
});
