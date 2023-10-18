import type { ConnectInstallation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const disconnectFigmaTeamUseCase = {
	execute: async (teamId: string, connectInstallation: ConnectInstallation) => {
		const figmaTeam =
			await figmaTeamRepository.getByTeamIdAndConnectInstallationId(
				teamId,
				connectInstallation.id,
			);

		await figmaService.tryDeleteWebhook(
			figmaTeam.webhookId,
			figmaTeam.adminInfo,
		);

		await figmaTeamRepository.delete(figmaTeam.id);
	},
};
