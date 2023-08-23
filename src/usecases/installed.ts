import { ConnectInstallationCreateParams } from '../domain/entities/connect-installation';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const installedUseCase = {
	execute: async (installation: ConnectInstallationCreateParams) => {
		await connectInstallationRepository.upsert(installation);
	},
};
