import { installedUseCase } from './installed';

import { ConnectInstallation } from '../domain/entities';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call repository layer upsert', async () => {
		const upsertSpy = jest
			.spyOn(connectInstallationRepository, 'upsert')
			.mockImplementation(() => Promise.resolve({} as ConnectInstallation));
		const installation = {
			key: 'test-key',
			clientKey: 'test-client-key',
			sharedSecret: 'secret',
			baseUrl: 'http://base-url.com',
			displayUrl: 'http://display-url.com',
		};

		await installedUseCase.execute(installation);

		expect(upsertSpy).toHaveBeenCalledWith(installation);
	});
});
