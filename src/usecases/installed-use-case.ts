import type { ConnectInstallationCreateParams } from '../domain/entities';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const installedUseCase = {
	/**
	 * @throw {Error} Unknown error.
	 */
	execute: async (installation: ConnectInstallationCreateParams) => {
		await connectInstallationRepository.upsert(installation);
	},
};
