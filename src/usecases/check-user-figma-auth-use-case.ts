import type { ConnectInstallation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';

export const checkUserFigmaAuthUseCase = {
	execute: async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<string | null> => {
		return figmaService.checkAuth({
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});
	},
};
