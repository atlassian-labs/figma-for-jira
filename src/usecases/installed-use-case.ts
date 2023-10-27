import type { ConnectInstallationCreateParams } from '../domain/entities';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const installedUseCase = {
	execute: async (installation: ConnectInstallationCreateParams) => {
		await connectInstallationRepository.upsert(installation);
	},
};
