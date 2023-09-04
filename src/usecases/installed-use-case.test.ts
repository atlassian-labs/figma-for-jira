import { installedUseCase } from './installed-use-case';

import type { ConnectInstallation } from '../domain/entities';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	it('should call repository layer upsert', async () => {
		jest
			.spyOn(connectInstallationRepository, 'upsert')
			.mockResolvedValue({} as ConnectInstallation);
		const installation = {
			key: 'test-key',
			clientKey: 'test-client-key',
			sharedSecret: 'secret',
			baseUrl: 'http://base-url.com',
			displayUrl: 'http://display-url.com',
		};

		await installedUseCase.execute(installation);

		expect(connectInstallationRepository.upsert).toHaveBeenCalledWith(
			installation,
		);
	});
});
