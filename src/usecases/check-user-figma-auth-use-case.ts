import type { ConnectInstallation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
export const checkUserFigmaAuthUseCase = {
	execute: async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<boolean> => {
		const currentUser = await figmaService.getCurrentUser({
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});

		return currentUser != null;
	},
};
