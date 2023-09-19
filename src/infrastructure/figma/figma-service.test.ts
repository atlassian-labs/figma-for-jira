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
	MeResponse,
} from './figma-client';
import { figmaClient } from './figma-client';
import {
	generateGetFileResponse,
	generateGetFileResponseWithNode,
	MOCK_CHILD_NODE,
} from './figma-client/testing';
import { buildIssueTitle, figmaService } from './figma-service';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import * as configModule from '../../config';
import { mockConfig } from '../../config/testing';
import {
	generateFigmaOAuth2UserCredentials,
	MOCK_FIGMA_DESIGN_IDENTITY,
	MOCK_FIGMA_FILE_IDENTITY,
	MOCK_FIGMA_NODE_IDENTITY,
	MOCK_ISSUE_KEY,
	MOCK_ISSUE_TITLE,
	MOCK_ISSUE_URL,
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
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponseWithNode({
				node: { ...MOCK_CHILD_NODE, id: MOCK_FIGMA_NODE_IDENTITY.nodeId! },
			});

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const result = await figmaService.fetchDesignById(
				MOCK_FIGMA_NODE_IDENTITY,
				ATLASSIAN_USER_ID,
			);

			const expectedEntity = transformNodeToAtlassianDesign({
				fileKey: MOCK_FIGMA_NODE_IDENTITY.fileKey,
				nodeId: MOCK_FIGMA_NODE_IDENTITY.nodeId!,
				fileResponseWithNode: mockResponse,
			});
			expect(result).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return a valid design entity if design id points out to file', async () => {
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
				MOCK_FIGMA_FILE_IDENTITY,
				ATLASSIAN_USER_ID,
			);

			const expectedEntity = transformFileToAtlassianDesign({
				fileKey: MOCK_FIGMA_FILE_IDENTITY.fileKey,
				fileResponse: mockResponse,
			});
			expect(res).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should throw when a request to a figma api fails', async () => {
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
				figmaService.fetchDesignById(
					MOCK_FIGMA_DESIGN_IDENTITY,
					ATLASSIAN_USER_ID,
				),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			await expect(() =>
				figmaService.fetchDesignById(
					MOCK_FIGMA_DESIGN_IDENTITY,
					ATLASSIAN_USER_ID,
				),
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
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.createDevResource({
				designId: MOCK_FIGMA_FILE_IDENTITY,
				issueUrl: MOCK_ISSUE_URL,
				issueKey: MOCK_ISSUE_KEY,
				issueTitle: MOCK_ISSUE_TITLE,
				atlassianUserId: ATLASSIAN_USER_ID,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: buildIssueTitle(MOCK_ISSUE_KEY, MOCK_ISSUE_TITLE),
				url: MOCK_ISSUE_URL,
				file_key: MOCK_FIGMA_FILE_IDENTITY.fileKey,
				node_id: '0:0',
			};
			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				[expectedDevResource],
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should call figmaClient to create a dev_resource when design points out to node', async () => {
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			await figmaService.createDevResource({
				designId: MOCK_FIGMA_NODE_IDENTITY,
				issueUrl: MOCK_ISSUE_URL,
				issueKey: MOCK_ISSUE_KEY,
				issueTitle: MOCK_ISSUE_TITLE,
				atlassianUserId: ATLASSIAN_USER_ID,
			});

			const expectedDevResource: CreateDevResourcesRequest = {
				name: buildIssueTitle(MOCK_ISSUE_KEY, MOCK_ISSUE_TITLE),
				url: MOCK_ISSUE_URL,
				file_key: MOCK_FIGMA_NODE_IDENTITY.fileKey,
				node_id: MOCK_FIGMA_NODE_IDENTITY.nodeId!,
			};
			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				[expectedDevResource],
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should throw when dev_resource creation fails', async () => {
			const expectedError = new Error('Dev resource create failed');
			jest
				.spyOn(figmaClient, 'createDevResources')
				.mockRejectedValue(expectedError);

			await expect(() =>
				figmaService.createDevResource({
					designId: MOCK_FIGMA_DESIGN_IDENTITY,
					issueUrl: MOCK_ISSUE_URL,
					issueKey: MOCK_ISSUE_KEY,
					issueTitle: MOCK_ISSUE_TITLE,
					atlassianUserId: ATLASSIAN_USER_ID,
				}),
			).rejects.toThrow(expectedError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const credentialsError = new FigmaServiceCredentialsError(
				ATLASSIAN_USER_ID,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);
			await expect(() =>
				figmaService.createDevResource({
					designId: MOCK_FIGMA_DESIGN_IDENTITY,
					issueUrl: MOCK_ISSUE_URL,
					issueKey: MOCK_ISSUE_KEY,
					issueTitle: MOCK_ISSUE_TITLE,
					atlassianUserId: ATLASSIAN_USER_ID,
				}),
			).rejects.toStrictEqual(credentialsError);
		});
	});
});
