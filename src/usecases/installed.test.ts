import { InstalledUseCase } from './installed';

import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';

describe('installedUseCase', () => {
	let repositoryMock: jest.MockedObject<ConnectInstallationRepository>;
	let sut: InstalledUseCase;

	beforeEach(() => {
		repositoryMock = {
			getInstallation: jest.fn(),
			upsertInstallation: jest.fn(),
		};

		sut = new InstalledUseCase(repositoryMock);
	});

	it('should call repository layer upsert', async () => {
		const installation = {
			key: 'test-key',
			clientKey: 'test-client-key',
			sharedSecret: 'secret',
			baseUrl: 'http://base-url.com',
			displayUrl: 'http://display-url.com',
		};

		await sut.execute(installation);

		expect(repositoryMock.upsertInstallation).toHaveBeenCalledWith(
			installation,
		);
	});
});
