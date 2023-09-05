import { uninstalledUseCase } from './uninstalled-use-case';

import { generateConnectInstallation } from '../domain/entities/testing';
import { getLogger } from '../infrastructure';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('uninstalledUseCase', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call repository layer delete', async () => {
		const installation = generateConnectInstallation();
		jest
			.spyOn(connectInstallationRepository, 'deleteByClientKey')
			.mockResolvedValue(installation);

		await uninstalledUseCase.execute(installation.clientKey);

		expect(
			connectInstallationRepository.deleteByClientKey,
		).toHaveBeenCalledWith(installation.clientKey);
	});

	it('should log a warning if repository delete call fails', async () => {
		jest
			.spyOn(connectInstallationRepository, 'deleteByClientKey')
			.mockRejectedValue(new Error('error'));

		await expect(
			uninstalledUseCase.execute('CLIENT_KEY'),
		).resolves.not.toThrowError();
		expect(getLogger().warn).toBeCalledTimes(1);
	});
});
