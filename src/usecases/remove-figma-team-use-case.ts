import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const removeFigmaTeamUseCase = {
	execute: async (teamId: string, connectInstallationId: string) => {
		const figmaTeam =
			await figmaTeamRepository.getByTeamIdAndConnectInstallationId(
				teamId,
				connectInstallationId,
			);

		await figmaService.tryDeleteWebhook(
			figmaTeam.webhookId,
			figmaTeam.adminInfo,
		);

		await figmaTeamRepository.delete(figmaTeam.id);
	},
};
