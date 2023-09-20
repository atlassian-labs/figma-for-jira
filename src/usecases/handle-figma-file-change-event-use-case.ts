import { FigmaTeamAuthStatus } from '../domain/entities';
import type { FigmaWebhookEventType } from '../infrastructure/figma';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const handleFigmaFileChangeEventUseCase = {
	execute: async (
		webhookId: string,
		fileKey: string,
		eventType: FigmaWebhookEventType,
	): Promise<void> => {
		// If an error is thrown while handling a webhook, Figma will retry
		// sending the event up to 3 times at 5/30/180 minutes.

		if (eventType !== 'FILE_UPDATE') {
			return;
		}

		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);

		// Ensure team admin OAuth2 credentials are still valid
		try {
			await figmaService.getValidCredentialsOrThrow(
				figmaTeam.figmaAdminAtlassianUserId,
			);
		} catch (e: unknown) {
			return figmaTeamRepository.updateStatus(
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

		await jiraService.updateDesigns(designs, connectInstallation);
	},
};
