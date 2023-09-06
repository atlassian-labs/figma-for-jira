import nock from 'nock';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import app from '../../../app';
import { JIRA_ISSUE_ATI } from '../../../common/constants';
import { getConfig } from '../../../config';
import {
	generateFigmaUserCredentialsCreateParams,
	generateJiraIssue,
} from '../../../domain/entities/testing';
import { transformNodeToAtlassianDesign } from '../../../infrastructure/figma/figma-transformer';
import {
	generateGetFileNodesResponse,
	MOCK_DESIGN_URL_WITH_NODE,
	MOCK_FILE_KEY,
	MOCK_ISSUE_ID,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
	VALID_ISSUE_ARI,
} from '../../../infrastructure/figma/testing';
import { generateSuccessfulSubmitDesignsResponse } from '../../../infrastructure/jira/jira-client/testing';
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

const FIGMA_API_BASE_URL = getConfig().figma.apiBaseUrl;
const FIGMA_ME_ENDPOINT = '/v1/me';
const FIGMA_FILE_NODES_ENDPOINT = '/v1/files';
const FIGMA_DEV_RESOURCES_ENDPOINT = '/v1/dev_resources';
const GET_ISSUE_ENDPOINT = '/rest/agile/1.0/issue';
const INGEST_DESIGN_ENDPOINT = '/rest/designs/1.0/bulk';

const mockMeEndpoint = ({
	success = true,
	times = 1,
}: {
	success: boolean;
	times?: number;
}) => {
	const statusCode = success ? 200 : 500;
	nock(FIGMA_API_BASE_URL)
		.get(FIGMA_ME_ENDPOINT)
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
	const statusCode = success ? 200 : 500;
	nock(FIGMA_API_BASE_URL, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`${FIGMA_FILE_NODES_ENDPOINT}/${MOCK_FILE_KEY}/nodes`)
		.query({ ids: MOCK_NODE_ID_URL })
		.reply(statusCode, response ?? {});
};

const mockGetIssueEndpoint = ({
	success = true,
}: { success?: boolean } = {}) => {
	const issue = generateJiraIssue();
	const statusCode = success ? 200 : 404;
	const response = success ? issue : {};
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.get(`${GET_ISSUE_ENDPOINT}/${MOCK_ISSUE_ID}`)
		.reply(statusCode, response);
};

const mockSubmitDesignsEndpoint = ({
	success = true,
}: {
	success?: boolean;
} = {}) => {
	const statusCode = success ? 200 : 500;
	nock(MOCK_CONNECT_INSTALLATION.baseUrl)
		.post(INGEST_DESIGN_ENDPOINT)
		.reply(
			statusCode,
			success ? generateSuccessfulSubmitDesignsResponse() : {},
		);
};

const mockCreateDevResourcesEndpoint = ({
	success = true,
}: {
	success?: boolean;
} = {}) => {
	const statusCode = success ? 200 : 500;
	nock(FIGMA_API_BASE_URL).post(FIGMA_DEV_RESOURCES_ENDPOINT).reply(statusCode);
};

const ASSOCIATE_ENTITY_ENDPOINT = '/entities/associateEntity';

const MOCK_REQUEST: AssociateEntityRequestParams = {
	entity: {
		url: MOCK_DESIGN_URL_WITH_NODE,
	},
	associateWith: {
		ati: JIRA_ISSUE_ATI,
		ari: VALID_ISSUE_ARI,
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
			jest.useRealTimers();
			await connectInstallationRepository
				.delete(MOCK_CLIENT_KEY)
				.catch(console.log);
			await figmaOAuth2UserCredentialsRepository
				.delete(validCredentialsParams.atlassianUserId)
				.catch(console.log);
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

			const expectedResponse = {
				design: transformNodeToAtlassianDesign({
					nodeId: MOCK_NODE_ID,
					url: MOCK_DESIGN_URL_WITH_NODE,
					isPrototype: false,
					associateWith: MOCK_REQUEST.associateWith,
					fileNodesResponse: mockFileNodesResponse,
				}),
			};

			return request(app)
				.post(ASSOCIATE_ENTITY_ENDPOINT)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.set('User-Id', validCredentialsParams.atlassianUserId)
				.expect(201)
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
				.delete(MOCK_CLIENT_KEY)
				.catch(console.log);
		});

		it('should respond with 401 "User-Id" header is not set', () => {
			return request(app)
				.post(ASSOCIATE_ENTITY_ENDPOINT)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.expect(401);
		});

		it('should respond with 401 if credentials are not found', () => {
			return request(app)
				.post(ASSOCIATE_ENTITY_ENDPOINT)
				.send(MOCK_REQUEST)
				.set('Authorization', JWT_TOKEN)
				.set('Content-Type', 'application/json')
				.expect(401);
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
					.post(ASSOCIATE_ENTITY_ENDPOINT)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(500);
			});

			it('should respond with 500 if fetching issue details fails', async () => {
				const credentials = await figmaOAuth2UserCredentialsRepository.get(
					validCredentialsParams.atlassianUserId,
				);
				const mockFileNodesResponse = generateGetFileNodesResponse();

				mockMeEndpoint({ success: true });
				mockGetFileNodesEndpoint({
					accessToken: credentials?.accessToken,
					response: mockFileNodesResponse,
				});
				mockGetIssueEndpoint({ success: false });

				return request(app)
					.post(ASSOCIATE_ENTITY_ENDPOINT)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(500);
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
				mockSubmitDesignsEndpoint({ success: false });

				return request(app)
					.post(ASSOCIATE_ENTITY_ENDPOINT)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(500);
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
				mockSubmitDesignsEndpoint();
				mockCreateDevResourcesEndpoint({ success: false });

				return request(app)
					.post(ASSOCIATE_ENTITY_ENDPOINT)
					.send(MOCK_REQUEST)
					.set('Authorization', JWT_TOKEN)
					.set('Content-Type', 'application/json')
					.set('User-Id', validCredentialsParams.atlassianUserId)
					.expect(500);
			});
		});
	});
});