import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import { v4 as uuidv4 } from 'uuid';

import { jiraIframeOrServerToServerSymmetricJwtTokenVerifier } from './jira-iframe-or-server-to-server-symmetric-jwt-token-verifier';

import { Duration } from '../../../common/duration';
import { generateConnectInstallation } from '../../../domain/entities/testing';
import { NotFoundHttpClientError } from '../../http-client-errors';
import { connectInstallationRepository } from '../../repositories';

const NOW = Date.now();
const NOW_IN_SECONDS = Math.floor(NOW / 1000);
const REQUEST = {
	method: 'GET',
	pathname: '/teams',
	params: { v: uuidv4() },
};

describe('JiraServerSymmetricJwtTokenVerifier', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('verify', () => {
		it('should verify token and return only Connect Installation when `sub` claim is not available', async () => {
			const clientKey = uuidv4();
			const connectInstallation = generateConnectInstallation({ clientKey });
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
				},
				connectInstallation.sharedSecret,
			);

			const result =
				await jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				);

			expect(result).toStrictEqual({
				connectInstallation,
				atlassianUserId: undefined,
			});
			expect(connectInstallationRepository.getByClientKey).toHaveBeenCalledWith(
				clientKey,
			);
		});

		it('should verify token and return Connect Installation and Atlassian User ID when `sub` claim is available', async () => {
			const atlassianUserId = uuidv4();
			const clientKey = uuidv4();
			const connectInstallation = generateConnectInstallation({ clientKey });
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
					sub: atlassianUserId,
				},
				connectInstallation.sharedSecret,
			);

			const result =
				await jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				);

			expect(result).toStrictEqual({
				connectInstallation,
				atlassianUserId,
			});
			expect(connectInstallationRepository.getByClientKey).toHaveBeenCalledWith(
				clientKey,
			);
		});

		it('should throw when there is no Connect Installation', async () => {
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockRejectedValue(new NotFoundHttpClientError());
			const jwtToken = encodeSymmetric(
				{
					iss: uuidv4(),
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
				},
				uuidv4(),
			);

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				),
			).rejects.toThrowError();
		});

		it('should throw token is not a JWT token', async () => {
			const jwtToken = uuidv4();

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				),
			).rejects.toThrowError();
		});

		it('should throw when token is signed with unexpected key', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
				},
				uuidv4(),
			);

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				),
			).rejects.toThrowError();
		});

		it('should throw when `iss` claim is incorrect', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: '',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				),
			).rejects.toThrowError();
		});

		it('should throw when `qsh` claim is incorrect', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash({
						...REQUEST,
						method: 'POST',
					}),
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(jwtToken, {
					...REQUEST,
					method: 'GET',
				}),
			).rejects.toThrowError('The token contains an invalid `qsh` claim.');
		});

		it('should throw when token is expired', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS - Duration.ofMinutes(5).asSeconds,
					qsh: createQueryStringHash(REQUEST),
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraIframeOrServerToServerSymmetricJwtTokenVerifier.verify(
					jwtToken,
					REQUEST,
				),
			).rejects.toThrowError('The token is expired.');
		});
	});
});
