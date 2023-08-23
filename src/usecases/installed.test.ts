import { installedUseCase } from './installed';

import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call repository layer upsert', async () => {
		const upsertSpy = jest
			.spyOn(connectInstallationRepository, 'upsert')
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.mockImplementation(() => Promise.resolve({} as any));
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
