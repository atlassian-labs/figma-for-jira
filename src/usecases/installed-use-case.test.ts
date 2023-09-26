import { installedUseCase } from './installed-use-case';

import { getRandomNumericId } from '../common/testing/utils';
import { generateConnectInstallationCreateParams } from '../domain/entities/testing';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	it('should call repository layer upsert', async () => {
		const installationCreateParams = generateConnectInstallationCreateParams();
		jest.spyOn(connectInstallationRepository, 'upsert').mockResolvedValue({
			...installationCreateParams,
			id: getRandomNumericId(),
		});

		await installedUseCase.execute(installationCreateParams);

		expect(connectInstallationRepository.upsert).toHaveBeenCalledWith(
			installationCreateParams,
		);
	});
});
