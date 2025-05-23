import {
	AsymmetricAlgorithm,
	createQueryStringHash,
	encodeAsymmetric,
} from 'atlassian-jwt';
import { v4 as uuidv4 } from 'uuid';

import { generateKeyPair } from 'node:crypto';
import { promisify } from 'util';

import { connectKeyServerClient } from './connect-key-server-client';
import { jiraAsymmetricJwtTokenVerifier } from './jira-asymmetric-jwt-token-verifier';

import { Duration } from '../../../common/duration';
import { getConfig } from '../../../config';

const NOW = Date.now();
const NOW_IN_SECONDS = Math.floor(NOW / 1000);
const KEY_ID = uuidv4();
const REQUEST = {
	method: 'GET',
	pathname: '/teams',
	params: { v: uuidv4() },
};

const generateRsaKeyPair = async (): Promise<{
	publicKey: string;
	privateKey: string;
}> => {
	const generateKeyPairPromisified = promisify(generateKeyPair);

	return generateKeyPairPromisified('rsa', {
		modulusLength: 1024,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem',
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
		},
	});
};

describe('JiraAsymmetricJwtTokenVerifier', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('verify', () => {
		it('should verify token', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).resolves.not.toThrowError();
			expect(
				connectKeyServerClient.getAtlassianConnectPublicKey,
			).toHaveBeenCalledWith(KEY_ID);
		});

		it('should throw when public key cannot be retrieved', async () => {
			const { privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockRejectedValue(new Error());
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError();
		});

		it('should throw token is not a JWT token', async () => {
			const jwtToken = uuidv4();

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError();
		});

		it('should throw when token is signed with unexpected key', async () => {
			const { privateKey } = await generateRsaKeyPair();
			const { publicKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError();
		});

		it('should throw when `iss` claim is incorrect', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: '',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError();
		});

		it('should throw when `qsh` claim is incorrect', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash({
						...REQUEST,
						method: 'GET',
					}),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, {
					...REQUEST,
					method: 'POST',
				}),
			).rejects.toThrowError('The token contains an invalid `qsh` claim.');
		});

		it('should throw when token is expired', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS - Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [new URL('test', getConfig().app.baseUrl).toString()],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError('The token is expired.');
		});

		it('should throw when `aud` is invalid', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: '',
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError();
		});

		it('should throw when `aud` does not contain app base URL', async () => {
			const { publicKey, privateKey } = await generateRsaKeyPair();
			jest
				.spyOn(connectKeyServerClient, 'getAtlassianConnectPublicKey')
				.mockResolvedValue(publicKey);
			const jwtToken = encodeAsymmetric(
				{
					iss: 'ISS',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					aud: [`https://${uuidv4()}.com`],
				},
				privateKey,
				AsymmetricAlgorithm.RS256,
				{
					kid: KEY_ID,
				},
			);

			await expect(
				jiraAsymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError('The token contains an invalid `aud` claim.');
		});
	});
});
