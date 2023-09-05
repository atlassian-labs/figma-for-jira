import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
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
import { DEFAULT_FIGMA_FILE_NODE_ID, figmaService } from './figma-service';
import {
	transformFileToAtlassianDesign,
	transformNodeId,
	transformNodeToAtlassianDesign,
} from './figma-transformer';
import {
	generateGetFileNodesResponse,
	generateGetFileResponse,
	MOCK_DESIGN_URL_WITH_NODE,
	MOCK_DESIGN_URL_WITHOUT_NODE,
	MOCK_FILE_KEY,
	MOCK_INVALID_DESIGN_URL,
	MOCK_NODE_ID,
	MOCK_NODE_ID_URL,
} from './testing';

import * as configModule from '../../config';
import { mockConfig } from '../../config/testing';
import { generateFigmaOAuth2UserCredentials } from '../../domain/entities/testing';

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
					status: 403,
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
					status: 500,
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

	describe('fetchDesign', () => {
		it('should return a valid design entity if a url is provided with a node_id', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileNodesResponse({
				nodeId: MOCK_NODE_ID,
			});

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFileNodes').mockResolvedValue(mockResponse);

			const expectedEntity = transformNodeToAtlassianDesign({
				nodeId: MOCK_NODE_ID,
				url: MOCK_DESIGN_URL_WITH_NODE,
				isPrototype: false,
				fileNodesResponse: mockResponse,
			});

			const res = await figmaService.fetchDesign(
				MOCK_DESIGN_URL_WITH_NODE,
				ATLASSIAN_USER_ID,
			);

			expect(res).toStrictEqual({
				...expectedEntity,
				lastUpdated: expect.anything(),
			});
		});

		it('should return a valid design entity if a file url is provided (without a node_id)', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileResponse();

			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const expectedEntity = transformFileToAtlassianDesign({
				url: MOCK_DESIGN_URL_WITHOUT_NODE,
				fileKey: MOCK_FILE_KEY,
				isPrototype: false,
				fileResponse: mockResponse,
			});

			const res = await figmaService.fetchDesign(
				MOCK_DESIGN_URL_WITHOUT_NODE,
				ATLASSIAN_USER_ID,
			);

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
				figmaService.fetchDesign(
					MOCK_DESIGN_URL_WITHOUT_NODE,
					ATLASSIAN_USER_ID,
				),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if an invalid url is provided', async () => {
			const invalidUrlError = new Error(
				`Received invalid Figma URL: ${MOCK_INVALID_DESIGN_URL}`,
			);
			await expect(() =>
				figmaService.fetchDesign(MOCK_INVALID_DESIGN_URL, ATLASSIAN_USER_ID),
			).rejects.toStrictEqual(invalidUrlError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			await expect(() =>
				figmaService.fetchDesign(MOCK_DESIGN_URL_WITH_NODE, ATLASSIAN_USER_ID),
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
		it('should call figmaClient to create a dev_resource with default 0:0 node_id for a file link', async () => {
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			const expectedDevResource: CreateDevResourcesRequest = {
				name: 'Test Issue',
				url: 'https://jira-issue.com/123',
				file_key: MOCK_FILE_KEY,
				node_id: DEFAULT_FIGMA_FILE_NODE_ID,
			};

			await figmaService.createDevResource(
				MOCK_DESIGN_URL_WITHOUT_NODE,
				ATLASSIAN_USER_ID,
			);

			expect(figmaClient.createDevResources).toHaveBeenCalledWith(
				[expectedDevResource],
				MOCK_CREDENTIALS.accessToken,
			);
		});

		it('should call figmaClient to create a dev_resource with node_id from URL for links with node_id', async () => {
			jest.spyOn(figmaClient, 'createDevResources').mockResolvedValue({
				links_created: [],
				errors: [],
			} as CreateDevResourcesResponse);

			const expectedDevResource: CreateDevResourcesRequest = {
				name: 'Test Issue',
				url: 'https://jira-issue.com/123',
				file_key: MOCK_FILE_KEY,
				node_id: transformNodeId(MOCK_NODE_ID_URL),
			};

			await figmaService.createDevResource(
				MOCK_DESIGN_URL_WITH_NODE,
				ATLASSIAN_USER_ID,
			);

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
				figmaService.createDevResource(
					MOCK_DESIGN_URL_WITH_NODE,
					ATLASSIAN_USER_ID,
				),
			).rejects.toThrow(expectedError);
		});

		it('should throw if an invalid url is provided', async () => {
			const invalidUrlError = new Error(
				`Received invalid Figma URL: ${MOCK_INVALID_DESIGN_URL}`,
			);
			await expect(() =>
				figmaService.createDevResource(
					MOCK_INVALID_DESIGN_URL,
					ATLASSIAN_USER_ID,
				),
			).rejects.toThrow(invalidUrlError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			const credentialsError = new FigmaServiceCredentialsError(
				ATLASSIAN_USER_ID,
			);
			jest
				.spyOn(figmaService, 'getValidCredentialsOrThrow')
				.mockRejectedValue(credentialsError);
			await expect(() =>
				figmaService.createDevResource(
					MOCK_DESIGN_URL_WITH_NODE,
					ATLASSIAN_USER_ID,
				),
			).rejects.toStrictEqual(credentialsError);
		});
	});
});
