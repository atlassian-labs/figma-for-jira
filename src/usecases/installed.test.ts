import { installedUseCase } from './installed';

import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';

describe('installedUseCase', () => {
	let repositoryMock: jest.MockedObject<ConnectInstallationRepository>;

	beforeEach(() => {
		repositoryMock = {
			getInstallation: jest.fn(),
			upsertInstallation: jest.fn(),
		};
	});

	it('should call repository layer upsert', () => {
		const installation = {
			key: 'test-key',
			clientKey: 'test-client-key',
			sharedSecret: 'secret',
			baseUrl: 'http://base-url.com',
			displayUrl: 'http://display-url.com',
		};

		installedUseCase(repositoryMock, installation);

		expect(repositoryMock.upsertInstallation).toHaveBeenCalledWith(
			installation,
		);
	});
});
