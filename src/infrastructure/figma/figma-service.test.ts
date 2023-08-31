import { AxiosError, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
} from './figma-auth-service';
import { figmaClient, MeResponse } from './figma-client';
import { figmaService } from './figma-service';
import {
	transformFileToDataDepotDesign,
	transformNodeToDataDepotDesign,
} from './figma-transformer';
import {
	DESIGN_URL_WITH_NODE,
	DESIGN_URL_WITHOUT_NODE,
	INVALID_DESIGN_URL,
	MOCK_FILE_KEY,
	MOCK_NODE_ID,
	MOCK_VALID_ASSOCIATION,
	mockGetFileNodesResponse,
	mockGetFileResponse,
} from './mocks';

import { FigmaOAuth2UserCredentials } from '../../domain/entities';

const ATLASSIAN_USER_ID = uuidv4();

// TODO: Move this code to the shared location.
const generateFigmaOAuth2UserCredentials = ({
	id = Date.now(),
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(),
} = {}) =>
	new FigmaOAuth2UserCredentials(
		id,
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	);

describe('FigmaService', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('validateAuth', () => {
		it('should return `true` when user is authorized to call Figma API', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'me').mockResolvedValue({} as MeResponse);

			const result = await figmaService.validateAuth(ATLASSIAN_USER_ID);

			expect(result).toBe(true);
			expect(figmaAuthService.getCredentials).toHaveBeenCalledWith(
				ATLASSIAN_USER_ID,
			);
			expect(figmaClient.me).toHaveBeenCalledWith(credentials.accessToken);
		});

		it('should return `false` when there is no credentials', async () => {
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockRejectedValue(new NoFigmaCredentialsError('No credentials.'));

			const result = await figmaService.validateAuth(ATLASSIAN_USER_ID);

			expect(result).toBe(false);
		});

		it('should return `false` when user is no authorized to call Figma API', async () => {
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

			const result = await figmaService.validateAuth(ATLASSIAN_USER_ID);

			expect(result).toBe(false);
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
				figmaService.validateAuth(ATLASSIAN_USER_ID),
			).rejects.toBe(forbiddenAxiosError);
		});
	});

	describe('fetchDesign', () => {
		it('should return a valid design entity if a url is provided with a node_id', async () => {
			const credentials = generateFigmaOAuth2UserCredentials();
			const mockResponse = mockGetFileNodesResponse({ nodeId: MOCK_NODE_ID });

			jest.spyOn(figmaService, 'validateAuth').mockResolvedValue(true);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFileNodes').mockResolvedValue(mockResponse);

			const expectedEntity = transformNodeToDataDepotDesign({
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
			const mockResponse = mockGetFileResponse({});

			jest.spyOn(figmaService, 'validateAuth').mockResolvedValue(true);
			jest
				.spyOn(figmaAuthService, 'getCredentials')
				.mockResolvedValue(credentials);
			jest.spyOn(figmaClient, 'getFile').mockResolvedValue(mockResponse);

			const expectedEntity = transformFileToDataDepotDesign({
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

			jest.spyOn(figmaService, 'validateAuth').mockResolvedValue(true);
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
			const invalidAuthError = new Error('Invalid auth');
			await expect(() =>
				figmaService.fetchDesign(
					DESIGN_URL_WITH_NODE,
					ATLASSIAN_USER_ID,
					MOCK_VALID_ASSOCIATION,
				),
			).rejects.toStrictEqual(invalidAuthError);
		});
	});
});
