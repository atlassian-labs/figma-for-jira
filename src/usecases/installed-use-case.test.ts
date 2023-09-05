import { installedUseCase } from './installed-use-case';

import { generateConnectInstallationCreateParams } from '../domain/entities/testing';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call repository layer upsert', async () => {
		const installationCreateParams = generateConnectInstallationCreateParams();
		jest
			.spyOn(connectInstallationRepository, 'upsert')
			.mockResolvedValue({ ...installationCreateParams, id: 1 });

		await installedUseCase.execute(installationCreateParams);

		expect(connectInstallationRepository.upsert).toHaveBeenCalledWith(
			installationCreateParams,
		);
	});
});
