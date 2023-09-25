import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { FigmaServiceCredentialsError } from './errors';
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
import { figmaClient, FigmaClientNotFoundError } from './figma-client';
import {
	generateChildNode,
	generateGetFileResponse,
	generateGetFileResponseWithNode,
} from './figma-client/testing';
import { buildIssueTitle, figmaService } from './figma-service';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import * as configModule from '../../config';
import { mockConfig } from '../../config/testing';
import {
	generateFigmaDesignIdentifier,
	generateFigmaNodeId,
	generateFigmaOAuth2UserCredentials,
	generateJiraIssueKey,
	generateJiraIssueUrl,
} from '../../domain/entities/testing';

const ATLASSIAN_USER_ID = uuidv4();

jest.mock('../../config', () => {
	return {
		...jest.requireActual('../../config'),
		getConfig: jest.fn(),
	};
});

describe('FigmaService', () => {
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

			const result =
				await figmaService.getValidCredentialsOrThrow(ATLASSIAN_USER_ID);

			expect(result).toBe(credentials);
			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				ATLASSIAN_USER_ID,
			);
			expect(figmaClient.me).toHaveBeenCalledWith(credentials.accessToken);
		});

		it('should throw when there is no credentials', async () => {
			const figmaCredentialsError = new NoFigmaCredentialsError(
				'No credentials.',
			);
			const expectedServiceError = new FigmaServiceCredentialsError(
				ATLASSIAN_USER_ID,
				figmaCredentialsError,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockRejectedValue(figmaCredentialsError);

			await expect(
				figmaService.getValidCredentialsOrThrow(ATLASSIAN_USER_ID),
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
				ATLASSIAN_USER_ID,
				forbiddenAxiosError,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(generateFigmaOAuth2UserCredentials());
			jest.spyOn(figmaClient, 'me').mockRejectedValue(forbiddenAxiosError);

			await expect(
				figmaService.getValidCredentialsOrThrow(ATLASSIAN_USER_ID),
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
				figmaService.getValidCredentialsOrThrow(ATLASSIAN_USER_ID),
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
				ATLASSIAN_USER_ID,
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
				ATLASSIAN_USER_ID,
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
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockRejectedValue(mockError);

			await expect(
				figmaService.fetchDesignById(designId, ATLASSIAN_USER_ID),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const designId = generateFigmaDesignIdentifier();

			await expect(() =>
				figmaService.fetchDesignById(designId, ATLASSIAN_USER_ID),
			).rejects.toBeInstanceOf(FigmaServiceCredentialsError);
		});
	});

	describe('createDevResource', () => {
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

			await figmaService.createDevResource({
				designId,
				issueUrl,
				issueKey,
				issueTitle,
				atlassianUserId: ATLASSIAN_USER_ID,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: buildIssueTitle(issueKey, issueTitle),
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

			await figmaService.createDevResource({
				designId,
				issueUrl,
				issueKey,
				issueTitle,
				atlassianUserId: ATLASSIAN_USER_ID,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: buildIssueTitle(issueKey, issueTitle),
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
				figmaService.createDevResource({
					designId,
					issueUrl,
					issueKey,
					issueTitle,
					atlassianUserId: ATLASSIAN_USER_ID,
				}),
			).rejects.toThrow(expectedError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const issueKey = generateJiraIssueKey();
			const issueUrl = generateJiraIssueUrl();
			const issueTitle = uuidv4();
			const designId = generateFigmaDesignIdentifier();
			const credentialsError = new FigmaServiceCredentialsError(
				ATLASSIAN_USER_ID,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);

			await expect(() =>
				figmaService.createDevResource({
					designId,
					issueUrl,
					issueKey,
					issueTitle,
					atlassianUserId: ATLASSIAN_USER_ID,
				}),
			).rejects.toStrictEqual(credentialsError);
		});
	});

	describe('createFileUpdateWebhook', () => {
		const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials();

		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to create a webhook', async () => {
			const webhookId = uuidv4();
			const teamId = uuidv4();
			const endpoint = `${mockConfig.app.baseUrl}/figma/webhook`;
			const passcode = 'passcode';
			const description = 'Figma for Jira Cloud';
			const connectInstallationSecret = uuidv4();

			jest
				.spyOn(figmaService, 'generateWebhookPasscode')
				.mockReturnValue(passcode);
			jest.spyOn(figmaClient, 'createWebhook').mockResolvedValue({
				id: webhookId,
				team_id: teamId,
				event_type: 'FILE_UPDATE',
				client_id: mockConfig.figma.clientId,
				endpoint,
				passcode,
				status: 'ACTIVE',
				description,
				protocol_version: '2',
			} as CreateWebhookResponse);

			await figmaService.createFileUpdateWebhook(
				teamId,
				MOCK_CREDENTIALS.atlassianUserId,
				connectInstallationSecret,
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
					MOCK_CREDENTIALS.atlassianUserId,
					connectInstallationSecret,
				),
			).rejects.toThrow(expectedError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const teamId = uuidv4();
			const connectInstallationSecret = uuidv4();
			const credentialsError = new FigmaServiceCredentialsError(
				ATLASSIAN_USER_ID,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);

			await expect(() =>
				figmaService.createFileUpdateWebhook(
					teamId,
					MOCK_CREDENTIALS.atlassianUserId,
					connectInstallationSecret,
				),
			).rejects.toStrictEqual(credentialsError);
		});
	});

	describe('deleteWebhook', () => {
		const MOCK_CREDENTIALS = generateFigmaOAuth2UserCredentials();

		beforeEach(() => {
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(MOCK_CREDENTIALS);
		});

		it('should call figmaClient to delete a webhook', async () => {
			const webhookId = uuidv4();
			jest.spyOn(figmaClient, 'deleteWebhook').mockResolvedValue();

			await figmaService.deleteWebhook(
				webhookId,
				MOCK_CREDENTIALS.atlassianUserId,
			);

			expect(figmaClient.deleteWebhook).toHaveBeenCalledWith(
				webhookId,
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should not throw when webhook is not found', async () => {
			const webhookId = uuidv4();
			jest
				.spyOn(figmaClient, 'deleteWebhook')
				.mockRejectedValue(new FigmaClientNotFoundError());

			await expect(
				figmaService.deleteWebhook(webhookId, MOCK_CREDENTIALS.atlassianUserId),
			).resolves.toBeUndefined();
		});
	});
});
