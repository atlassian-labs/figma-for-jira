import type { AxiosResponse } from 'axios';
import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
} from './figma-auth-service';
import type { MeResponse } from './figma-client';
import { figmaClient } from './figma-client';
import { figmaService } from './figma-service';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './figma-transformer';
import {
	DESIGN_URL_WITH_NODE,
	DESIGN_URL_WITHOUT_NODE,
	generateGetFileNodesResponse,
	generateGetFileResponse,
	INVALID_DESIGN_URL,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
	MOCK_VALID_ASSOCIATION,
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

	describe('getValidCredentials', () => {
		it('should return credentials when user is authorized to call Figma API', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'me').mockResolvedValue({} as MeResponse);

			const result = await figmaService.getValidCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(credentials);
			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				ATLASSIAN_USER_ID,
			);
			expect(figmaClient.me).toHaveBeenCalledWith(credentials.accessToken);
		});

		it('should return `null` when there is no credentials', async () => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockRejectedValue(new NoFigmaCredentialsError('No credentials.'));

			const result = await figmaService.getValidCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(null);
		});

		it('should return `null` when user is no authorized to call Figma API', async () => {
			const forbiddenAxiosError = new AxiosError(
				'Error',
				undefined,
				undefined,
				undefined,
				{
					status: 403,
				} as AxiosResponse,
			);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(generateFigmaOAuth2UserCredentials());
			jest.spyOn(figmaClient, 'me').mockRejectedValue(forbiddenAxiosError);

			const result = await figmaService.getValidCredentials(ATLASSIAN_USER_ID);

			expect(result).toBe(null);
		});

		it('should throw when request to Figma API result in non-403 error', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const forbiddenAxiosError = new AxiosError(
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
			jest.spyOn(figmaClient, 'me').mockRejectedValue(forbiddenAxiosError);

			await expect(() =>
				figmaService.getValidCredentials(ATLASSIAN_USER_ID),
			).rejects.toBe(forbiddenAxiosError);
		});
	});

	describe('fetchDesign', () => {
		it('should return a valid design entity if a url is provided with a node_id', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = generateGetFileNodesResponse({
				nodeId: MOCK_NODE_ID,
			});

			jest
				.spyOn(figmaService, 'getValidCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFileNodes').mockResolvedValue(mockResponse);

			const expectedEntity = transformNodeToAtlassianDesign({
				nodeId: MOCK_NODE_ID,
				url: DESIGN_URL_WITH_NODE,
				isPrototype: false,
				associateWith: MOCK_VALID_ASSOCIATION,
				fileNodesResponse: mockResponse,
			});

			const res = await figmaService.fetchDesign(
				DESIGN_URL_WITH_NODE,
				ATLASSIAN_USER_ID,
				MOCK_VALID_ASSOCIATION,
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
				.spyOn(figmaService, 'getValidCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const expectedEntity = transformFileToAtlassianDesign({
				url: DESIGN_URL_WITHOUT_NODE,
				fileKey: MOCK_FILE_KEY,
				isPrototype: false,
				associateWith: MOCK_VALID_ASSOCIATION,
				fileResponse: mockResponse,
			});

			const res = await figmaService.fetchDesign(
				DESIGN_URL_WITHOUT_NODE,
				ATLASSIAN_USER_ID,
				MOCK_VALID_ASSOCIATION,
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
				.spyOn(figmaService, 'getValidCredentials')
				.mockResolvedValue(credentials);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockRejectedValue(mockError);

			await expect(
				figmaService.fetchDesign(
					DESIGN_URL_WITHOUT_NODE,
					ATLASSIAN_USER_ID,
					MOCK_VALID_ASSOCIATION,
				),
			).rejects.toStrictEqual(mockError);
		});

		it('should throw if an invalid url is provided', async () => {
			const invalidUrlError = new Error(
				`Received invalid Figma URL: ${INVALID_DESIGN_URL}`,
			);
			await expect(() =>
				figmaService.fetchDesign(
					INVALID_DESIGN_URL,
					ATLASSIAN_USER_ID,
					MOCK_VALID_ASSOCIATION,
				),
			).rejects.toStrictEqual(invalidUrlError);
		});

		it('should throw if the atlassian user is not authorized', async () => {
			await expect(() =>
				figmaService.fetchDesign(
					DESIGN_URL_WITH_NODE,
					ATLASSIAN_USER_ID,
					MOCK_VALID_ASSOCIATION,
				),
			).rejects.toThrow();
		});
	});
});
