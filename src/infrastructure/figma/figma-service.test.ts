import { AxiosError, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
} from './figma-auth-service';
import { figmaClient, MeResponse } from './figma-client';
import { figmaService } from './figma-service';

import { generateFigmaOAuth2UserCredentials } from '../../domain/entities/testing/mocks';

const ATLASSIAN_USER_ID = uuidv4();

describe('FigmaService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
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
});
