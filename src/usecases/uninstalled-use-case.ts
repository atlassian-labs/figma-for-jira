import { getLogger } from '../infrastructure';
import { connectInstallationRepository } from '../infrastructure/repositories';

export const uninstalledUseCase = {
	execute: async (clientKey: string) => {
		try {
			await connectInstallationRepository.deleteByClientKey(clientKey);
		} catch (e: unknown) {
			getLogger().warn(
				e,
				`Received uninstall event for ${clientKey} but failed to delete ConnectInstallation`,
			);
		}
	},
};
