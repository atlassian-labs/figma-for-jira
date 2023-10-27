import type { ConnectInstallation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';

export const checkUserFigmaAuthUseCase = {
	/**
	 * @throw {Error} Unknown error.
	 */
	execute: async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<boolean> => {
		return figmaService.checkAuth({
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});
	},
};
