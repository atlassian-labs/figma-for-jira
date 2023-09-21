import { FigmaTeamAuthStatus } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const handleFigmaFileUpdateEventUseCase = {
	execute: async (webhookId: string, fileKey: string): Promise<void> => {
		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);

		// Ensure team admin OAuth2 credentials are still valid
		try {
			await figmaService.getValidCredentialsOrThrow(
				figmaTeam.figmaAdminAtlassianUserId,
			);
		} catch (e: unknown) {
			return figmaTeamRepository.updateAuthStatus(
				figmaTeam.id,
				FigmaTeamAuthStatus.ERROR,
			);
		}

		const [connectInstallation, associatedFigmaDesigns] = await Promise.all([
			connectInstallationRepository.get(figmaTeam.connectInstallationId),
			associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
				fileKey,
				figmaTeam.connectInstallationId,
			),
		]);

		const designs = await Promise.all(
			associatedFigmaDesigns.map((design) =>
				figmaService.fetchDesignById(
					design.designId,
					figmaTeam.figmaAdminAtlassianUserId,
				),
			),
		);

		await jiraService.submitDesigns(
			designs.map((design) => ({ design })),
			connectInstallation,
		);
	},
};
