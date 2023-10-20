import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { FigmaServiceCredentialsError, FigmaServiceError } from './errors';
import {
	figmaAuthService,
	NoFigmaCredentialsError,
} from './figma-auth-service';
import type {
	CreateDevResourcesRequest,
	CreateDevResourcesResponse,
	CreateWebhookRequest,
	CreateWebhookResponse,
	MeResponse,
} from './figma-client';
import { figmaClient } from './figma-client';
import {
	generateChildNode,
	generateFrameNode,
	generateGetFileResponse,
	generateGetFileResponseWithNode,
	generateGetFileResponseWithNodes,
} from './figma-client/testing';
import { figmaService } from './figma-service';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import * as configModule from '../../config';
import { mockConfig } from '../../config/testing';
import {
	generateConnectUserInfo,
	generateFigmaDesignIdentifier,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentials,
	generateJiraIssueKey,
	generateJiraIssueUrl,
} from '../../domain/entities/testing';

jest.mock('../../config', () => {
	return {
		...jest.requireActual('../../config'),
		getConfig: jest.fn(),
	};
});

describe('FigmaService', () => {
	const MOCK_CONNECT_USER_INFO = generateConnectUserInfo();
	const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials({
		atlassianUserId: MOCK_CONNECT_USER_INFO.atlassianUserId,
		connectInstallationId: MOCK_CONNECT_USER_INFO.connectInstallationId,
	});

	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getValidCredentialsOrThrow', () => {
		it('should return credentials when user is authorized to call Figma API', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'me').mockResolvedValue({} as MeResponse);

			const result = await figmaService.getValidCredentialsOrThrow(
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toBe(credentials);
			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				MOCK_CONNECT_USER_INFO,
			);
			expect(figmaClient.me).toHaveBeenCalledWith(credentials.accessToken);
		});

		it('should throw when there is no credentials', async () => {
			const figmaCredentialsError = new NoFigmaCredentialsError(
				'No credentials.',
			);
			const expectedServiceError = new FigmaServiceCredentialsError(
				MOCK_CONNECT_USER_INFO.atlassianUserId,
				figmaCredentialsError,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockRejectedValue(figmaCredentialsError);

			await expect(
				figmaService.getValidCredentialsOrThrow(MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(expectedServiceError);
		});

		it('should throw when user is not authorized to call Figma API', async () => {
			const forbiddenAxiosError = new AxiosError(
				'Error',
				undefined,
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			const expectedServiceError = new FigmaServiceCredentialsError(
				MOCK_CONNECT_USER_INFO.atlassianUserId,
				forbiddenAxiosError,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(generateFigmaOAuth2UserCredentials());
			jest.spyOn(figmaClient, 'me').mockRejectedValue(forbiddenAxiosError);

			await expect(
				figmaService.getValidCredentialsOrThrow(MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(expectedServiceError);
		});

		it('should throw when request to Figma API result in non-403 error', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const expectedError = new AxiosError(
				'Error',
				undefined,
				undefined,
				undefined,
				{
					status: HttpStatusCode.InternalServerError,
				} as AxiosResponse,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'me').mockRejectedValue(expectedError);

			await expect(
				figmaService.getValidCredentialsOrThrow(MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(expectedError);
		});
	});

	describe('fetchDesignById', () => {
		it('should return a valid design entity if design id points out to node', async () => {
			const nodeId = generateFigmaNodeId();
			const node = generateChildNode({ id: nodeId });
			const designId = generateFigmaDesignIdentifier({ nodeId });
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponseWithNode({ node });

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const result = await figmaService.fetchDesignById(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = transformNodeToAtlassianDesign({
				fileKey: designId.fileKey,
				nodeId: designId.nodeId!,
				fileResponse: mockResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return a valid design entity if design id points out to file', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponse();

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const res = await figmaService.fetchDesignById(
				designId,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedEntity = transformFileToAtlassianDesign({
				fileKey: designId.fileKey,
				fileResponse: mockResponse,
			});
			expect(res).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should throw when a request to a figma api fails', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockError = new Error('Figma API failed');

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockRejectedValue(mockError);

			await expect(
				figmaService.fetchDesignById(designId, MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const designId = generateFigmaDesignIdentifier();

			await expect(() =>
				figmaService.fetchDesignById(designId, MOCK_CONNECT_USER_INFO),
			).rejects.toBeInstanceOf(FigmaServiceCredentialsError);
		});
	});

	describe('fetchDesignsByIds', () => {
		it('should return valid design entities for design ids with and without node ids', async () => {
			const nodeId1 = generateFigmaNodeId();
			const node1 = generateFrameNode({ id: nodeId1 });
			const nodeId2 = generateFigmaNodeId();
			const node2 = generateFrameNode({ id: nodeId2 });
			const designIdWithoutNode = generateFigmaDesignIdentifier();
			const designIdWithNode1 = generateFigmaDesignIdentifier({
				fileKey: designIdWithoutNode.fileKey,
				nodeId: nodeId1,
			});
			const designIdWithNode2 = generateFigmaDesignIdentifier({
				fileKey: designIdWithoutNode.fileKey,
				nodeId: nodeId2,
			});
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponseWithNodes({
				nodes: [node1, node2],
			});

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const result = await figmaService.fetchDesignsByIds(
				[designIdWithoutNode, designIdWithNode1, designIdWithNode2],
				MOCK_CONNECT_USER_INFO,
			);

			const expectedResult = [
				transformFileToAtlassianDesign({
					fileKey: designIdWithoutNode.fileKey,
					fileResponse: mockResponse,
				}),
				transformNodeToAtlassianDesign({
					fileKey: designIdWithNode1.fileKey,
					nodeId: designIdWithNode1.nodeId!,
					fileResponse: mockResponse,
				}),
				transformNodeToAtlassianDesign({
					fileKey: designIdWithNode2.fileKey,
					nodeId: designIdWithNode2.nodeId!,
					fileResponse: mockResponse,
				}),
			];

			expect(result).toStrictEqual(expectedResult);
		});

		it('should immediately return an empty array if passed an empty design ids array', async () => {
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

			const result = await figmaService.fetchDesignsByIds(
				[],
				MOCK_CONNECT_USER_INFO,
			);

			expect(result).toStrictEqual([]);
			expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
		});

		it('should throw a FigmaServiceError if design ids have different file keys', async () => {
			const designIds = [
				generateFigmaDesignIdentifier(),
				generateFigmaDesignIdentifier(),
				generateFigmaDesignIdentifier(),
			];
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

			await expect(
				figmaService.fetchDesignsByIds(designIds, MOCK_CONNECT_USER_INFO),
			).rejects.toBeInstanceOf(FigmaServiceError);
			expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
		});

		it('should throw when a request to a figma api fails', async () => {
			const designId = generateFigmaDesignIdentifier();
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockError = new Error('Figma API failed');

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockRejectedValue(mockError);

			await expect(
				figmaService.fetchDesignsByIds([designId], MOCK_CONNECT_USER_INFO),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const designId = generateFigmaDesignIdentifier();

			await expect(() =>
				figmaService.fetchDesignsByIds([designId], MOCK_CONNECT_USER_INFO),
			).rejects.toBeInstanceOf(FigmaServiceCredentialsError);
		});
	});

	describe('createDevResourceForJiraIssue', () => {
		const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials();
		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to create a dev_resource when design points out to file', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.createDevResourceForJiraIssue({
				designId,
				issue: {
					url: issueUrl,
					key: issueKey,
					title: issueTitle,
				},
				user: MOCK_CONNECT_USER_INFO,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: `[${issueKey}] ${issueTitle}`,
				url: issueUrl,
				file_key: designId.fileKey,
				node_id: '0:0',
			};
			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				[expectedDevResource],
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should call figmaClient to create a dev_resource when design points out to node', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const nodeId = generateFigmaNodeId();
			const designId = generateFigmaDesignIdentifier({ nodeId });
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.createDevResourceForJiraIssue({
				designId,
				issue: {
					url: issueUrl,
					key: issueKey,
					title: issueTitle,
				},
				user: MOCK_CONNECT_USER_INFO,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: `[${issueKey}] ${issueTitle}`,
				url: issueUrl,
				file_key: designId.fileKey,
				node_id: designId.nodeId!,
			};
			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				[expectedDevResource],
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should throw when dev_resource creation fails', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			const expectedError = new Error('Dev resource create failed');
			jest
				.spyOn(figmaClient, 'createDevResources')
				.mockRejectedValue(expectedError);

			await expect(() =>
				figmaService.createDevResourceForJiraIssue({
					designId,
					issue: {
						url: issueUrl,
						key: issueKey,
						title: issueTitle,
					},
					user: MOCK_CONNECT_USER_INFO,
				}),
			).rejects.toThrow(expectedError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl({ key: issueKey });
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			const credentialsError = new FigmaServiceCredentialsError(
				MOCK_CONNECT_USER_INFO.atlassianUserId,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);

			await expect(() =>
				figmaService.createDevResourceForJiraIssue({
					designId,
					issue: {
						url: issueUrl,
						key: issueKey,
						title: issueTitle,
					},
					user: MOCK_CONNECT_USER_INFO,
				}),
			).rejects.toStrictEqual(credentialsError);
		});
	});

	describe('createFileUpdateWebhook', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to create a webhook', async () => {
			const webhookId = uuidv4();
			const teamId = uuidv4();
			const endpoint = `${mockConfig.app.baseUrl}/figma/webhook`;
			const passcode = uuidv4();
			const description = 'Figma for Jira Cloud';

			jest.spyOn(figmaClient, 'createWebhook').mockResolvedValue({
				id: webhookId,
				team_id: teamId,
				event_type: 'FILE_UPDATE',
				client_id: mockConfig.figma.oauth2.clientId,
				endpoint,
				passcode,
				status: 'ACTIVE',
				description,
				protocol_version: '2',
			} as CreateWebhookResponse);

			await figmaService.createFileUpdateWebhook(
				teamId,
				passcode,
				MOCK_CONNECT_USER_INFO,
			);

			const expectedCreateWebhookRequest: CreateWebhookRequest = {
				event_type: 'FILE_UPDATE',
				team_id: teamId,
				endpoint,
				passcode,
				description,
			};
			expect(figmaClient.createWebhook).toHaveBeenCalledWith(
				expectedCreateWebhookRequest,
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should throw when webhook creation fails', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();
			const expectedError = new Error('Webhook create failed');
			jest.spyOn(figmaClient, 'createWebhook').mockRejectedValue(expectedError);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					connectInstallationSecret,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toThrow(expectedError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();
			const credentialsError = new FigmaServiceCredentialsError(
				MOCK_CREDENTIALS.atlassianUserId,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					connectInstallationSecret,
					MOCK_CONNECT_USER_INFO,
				),
			).rejects.toStrictEqual(credentialsError);
		});
	});

	describe('tryDeleteWebhook', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to delete a webhook', async () => {
			const webhookId = uuidv4();
			jest.spyOn(figmaClient, 'deleteWebhook').mockResolvedValue();

			await figmaService.tryDeleteWebhook(webhookId, MOCK_CONNECT_USER_INFO);

			expect(figmaClient.deleteWebhook).toHaveBeenCalledWith(
				webhookId,
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should not throw when deletion fails', async () => {
			const webhookId = uuidv4();
			jest.spyOn(figmaClient, 'deleteWebhook').mockRejectedValue(new Error());

			await expect(
				figmaService.tryDeleteWebhook(webhookId, MOCK_CONNECT_USER_INFO),
			).resolves.toBeUndefined();
		});
	});

	describe('getTeamName', () => {
		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to get team name', async () => {
			const teamId = uuidv4();
			const teamName = uuidv4();

			jest
				.spyOn(figmaClient, 'getTeamProjects')
				.mockResolvedValue({ name: teamName, projects: [] });

			const result = await figmaService.getTeamName(
				teamId,
				MOCK_CONNECT_USER_INFO,
			);
			expect(result).toStrictEqual(teamName);
		});
	});
});
