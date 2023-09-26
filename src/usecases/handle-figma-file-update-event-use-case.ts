import type { FigmaTeam } from '../domain/entities';
import { FigmaTeamAuthStatus } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const handleFigmaFileUpdateEventUseCase = {
	execute: async (figmaTeam: FigmaTeam, fileKey: string): Promise<void> => {
		const [connectInstallation, associatedFigmaDesigns] = await Promise.all([
			connectInstallationRepository.get(figmaTeam.connectInstallationId),
			associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
				fileKey,
				figmaTeam.connectInstallationId,
			),
		]);

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
