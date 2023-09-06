import { uninstalledUseCase } from './uninstalled-use-case';

import { generateConnectInstallation } from '../domain/entities/testing';
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

	it('should throw if repository delete call fails', async () => {
		const deleteError = new Error('error');
		jest
			.spyOn(connectInstallationRepository, 'deleteByClientKey')
			.mockRejectedValue(deleteError);

		await expect(
			uninstalledUseCase.execute('CLIENT_KEY'),
		).rejects.toStrictEqual(deleteError);
	});
});
