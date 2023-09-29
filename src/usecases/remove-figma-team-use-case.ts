import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const removeFigmaTeamUseCase = {
	execute: async (teamId: string, connectInstallationId: string) => {
		const { id, webhookId, figmaAdminAtlassianUserId } =
			await figmaTeamRepository.getByTeamIdAndConnectInstallationId(
				teamId,
				connectInstallationId,
			);

		await figmaService.tryDeleteWebhook(webhookId, {
			atlassianUserId: figmaAdminAtlassianUserId,
			connectInstallationId,
		});

		await figmaTeamRepository.delete(id);
	},
};
