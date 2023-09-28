import { getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const removeFigmaTeamUseCase = {
	execute: async (teamId: string, connectInstallationId: string) => {
		const { id, webhookId, figmaAdminAtlassianUserId } =
			await figmaTeamRepository.getByTeamIdAndConnectInstallationId(
				teamId,
				connectInstallationId,
			);

		try {
			await figmaService.deleteWebhook(webhookId, figmaAdminAtlassianUserId);
		} catch (e: unknown) {
			getLogger().warn(
				e,
				`Failed to delete webhook ${webhookId} with user ${figmaAdminAtlassianUserId} when removing FigmaTeam ${id}`,
			);
		}

		await figmaTeamRepository.delete(id);
	},
};
