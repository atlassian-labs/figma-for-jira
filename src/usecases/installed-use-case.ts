import type { ConnectInstallationCreateParams } from '../domain/entities';
import { jiraService } from '../infrastructure/jira';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const installedUseCase = {
	execute: async (installation: ConnectInstallationCreateParams) => {
		const connectInstallation =
			await connectInstallationRepository.upsert(installation);
		// Ensure the configuration state for any prior installation is unset
		await jiraService.deleteAppConfigurationState(connectInstallation);
	},
};
