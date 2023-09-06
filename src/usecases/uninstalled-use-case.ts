import { connectInstallationRepository } from '../infrastructure/repositories';

export const uninstalledUseCase = {
	execute: async (clientKey: string) => {
		await connectInstallationRepository.deleteByClientKey(clientKey);
	},
};
