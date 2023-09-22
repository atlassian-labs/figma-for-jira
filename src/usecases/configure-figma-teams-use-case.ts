import {
	type ConnectInstallation,
	FigmaTeamAuthStatus,
} from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const configureFigmaTeamUseCase = {
	execute: async (
		teamId: string,
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const { webhookId, teamId: figmaTeamId } =
			await figmaService.createFileUpdateWebhook(
				teamId,
				atlassianUserId,
				connectInstallation.sharedSecret,
			);
		await figmaTeamRepository.upsert({
			webhookId,
			teamId: figmaTeamId,
			teamName: 'TODO',
			figmaAdminAtlassianUserId: atlassianUserId,
			authStatus: FigmaTeamAuthStatus.OK,
			connectInstallationId: connectInstallation.id,
		});
	},
};
