import { createQueryStringHash, encodeSymmetric } from 'atlassian-jwt';
import { v4 as uuidv4 } from 'uuid';

import { jiraServerSymmetricJwtTokenVerifier } from './jira-server-symmetric-jwt-token-verifier';

import { Duration } from '../../../common/duration';
import { generateConnectInstallation } from '../../../domain/entities/testing';
import { UnauthorizedError } from '../../../web/middleware/errors';
import {
	connectInstallationRepository,
	RepositoryRecordNotFoundError,
} from '../../repositories';

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
		it('should verify token and return relevant Connect Installation', async () => {
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

			const result = await jiraServerSymmetricJwtTokenVerifier.verify(
				jwtToken,
				REQUEST,
			);

			expect(result).toStrictEqual({
				connectInstallation,
			});
			expect(connectInstallationRepository.getByClientKey).toHaveBeenCalledWith(
				clientKey,
			);
		});

		it('should throw when there is no Connect Installation', async () => {
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockRejectedValue(new RepositoryRecordNotFoundError());
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
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw token is not a JWT token', async () => {
			const jwtToken = uuidv4();

			await expect(
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError(UnauthorizedError);
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
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError(UnauthorizedError);
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
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError(UnauthorizedError);
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
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, {
					...REQUEST,
					method: 'GET',
				}),
			).rejects.toThrowError(
				new UnauthorizedError('The token contains an invalid `qsh` claim.'),
			);
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
				jiraServerSymmetricJwtTokenVerifier.verify(jwtToken, REQUEST),
			).rejects.toThrowError(new UnauthorizedError('The token is expired.'));
		});
	});
});
