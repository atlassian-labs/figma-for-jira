import { encodeSymmetric } from 'atlassian-jwt';
import { v4 as uuidv4 } from 'uuid';

import { jiraContextSymmetricJwtTokenVerifier } from './jira-context-symmetric-jwt-token-verifier';

import { Duration } from '../../../common/duration';
import { NotFoundOperationError } from '../../../common/errors';
import { generateConnectInstallation } from '../../../domain/entities/testing';
import { UnauthorizedError } from '../../../web/middleware/errors';
import { connectInstallationRepository } from '../../repositories';

const NOW = Date.now();
const NOW_IN_SECONDS = Math.floor(NOW / 1000);

describe('JiraContextSymmetricJwtTokenVerifier', () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('verify', () => {
		it('should verify token and return relevant Connect Installation', async () => {
			const atlassianUserId = uuidv4();
			const clientKey = uuidv4();
			const connectInstallation = generateConnectInstallation({ clientKey });
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'context-qsh',
				},
				connectInstallation.sharedSecret,
			);

			const result =
				await jiraContextSymmetricJwtTokenVerifier.verify(jwtToken);

			expect(result).toStrictEqual({
				atlassianUserId,
				connectInstallation,
			});
			expect(connectInstallationRepository.getByClientKey).toHaveBeenCalledWith(
				clientKey,
			);
		});

		it('should throw when there is no Connect Installation', async () => {
			const atlassianUserId = uuidv4();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockRejectedValue(new NotFoundOperationError());
			const jwtToken = encodeSymmetric(
				{
					iss: uuidv4(),
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'context-qsh',
				},
				uuidv4(),
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw token is not a JWT token', async () => {
			const jwtToken = uuidv4();

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw when token is signed with unexpected key', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'context-qsh',
				},
				uuidv4(),
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw when `iss` claim is incorrect', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: '',
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'context-qsh',
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw when `sub` claim is incorrect', async () => {
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					qsh: 'context-qsh',
					sub: '',
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw when `qsh` claim is incorrect', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS + Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'incorrect-qsh',
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(UnauthorizedError);
		});

		it('should throw when token is expired', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(connectInstallationRepository, 'getByClientKey')
				.mockResolvedValue(connectInstallation);
			const jwtToken = encodeSymmetric(
				{
					iss: connectInstallation.clientKey,
					iat: NOW_IN_SECONDS,
					exp: NOW_IN_SECONDS - Duration.ofMinutes(5).asSeconds,
					sub: atlassianUserId,
					qsh: 'context-qsh',
				},
				connectInstallation.sharedSecret,
			);

			await expect(
				jiraContextSymmetricJwtTokenVerifier.verify(jwtToken),
			).rejects.toThrowError(new UnauthorizedError('The token is expired.'));
		});
	});
});
