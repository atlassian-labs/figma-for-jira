import axios from 'axios';

import { figmaClient } from './figma-client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Figma Client', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('happy path', () => {
		beforeEach(() => {
			mockedAxios.post.mockResolvedValue(() => ({
				data: {
					access_token: '123',
					refresh_token: '456',
					expires_in: 99999,
				},
			}));
		});
		it.only('should make a valid request to Figma to exchange code for access token', () => {
			const test = figmaClient.getOAuth2Token('code');
			console.log('test', test);
		});
		it('should return response mapped to domain type', () => {});
		it('should make a valid request to Figma to exchange code for access token', () => {});
	});
	describe('error cases', () => {
		it('should log an error on invalid requests', () => {});
	});
});
