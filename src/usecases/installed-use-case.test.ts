import { installedUseCase } from './installed-use-case';

import { generateNumericStringId } from '../common/testing/utils';
import { generateConnectInstallationCreateParams } from '../domain/entities/testing';
import { jiraService } from '../infrastructure/jira';
import { connectInstallationRepository } from '../infrastructure/repositories';

describe('installedUseCase', () => {
	it('should call repository layer upsert', async () => {
		const installationCreateParams = generateConnectInstallationCreateParams();
		const connectInstallation = {
			...installationCreateParams,
			id: generateNumericStringId(),
		};
		jest
			.spyOn(connectInstallationRepository, 'upsert')
			.mockResolvedValue(connectInstallation);
		jest
			.spyOn(jiraService, 'deleteAppConfigurationState')
			.mockResolvedValue(undefined);

		await installedUseCase.execute(installationCreateParams);

		expect(connectInstallationRepository.upsert).toHaveBeenCalledWith(
			installationCreateParams,
		);
		expect(jiraService.deleteAppConfigurationState).toHaveBeenCalledWith(
			connectInstallation,
		);
	});
});
