import { type FigmaTeam, FigmaTeamAuthStatus } from '../domain/entities';
import { getLogger } from '../infrastructure';
import {
	figmaService,
	FigmaServiceCredentialsError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const handleFigmaFileUpdateEventUseCase = {
	execute: async (figmaTeam: FigmaTeam, fileKey: string): Promise<void> => {
		try {
			const teamName = await figmaService.getTeamName(
				figmaTeam.teamId,
				figmaTeam.figmaAdminAtlassianUserId,
			);
			await figmaTeamRepository.updateTeamName(figmaTeam.id, teamName);
		} catch (e: unknown) {
			if (e instanceof FigmaServiceCredentialsError) {
				await figmaTeamRepository.updateAuthStatus(
					figmaTeam.id,
					FigmaTeamAuthStatus.ERROR,
				);
				return;
			}

			getLogger().warn(e, `Failed to sync team name for ${figmaTeam.id}`);
		}

		const [connectInstallation, associatedFigmaDesigns] = await Promise.all([
			connectInstallationRepository.get(figmaTeam.connectInstallationId),
			associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
				fileKey,
				figmaTeam.connectInstallationId,
			),
		]);

		try {
			const designs = await figmaService.fetchDesignsByIds(
				associatedFigmaDesigns.map((design) => design.designId),
				figmaTeam.figmaAdminAtlassianUserId,
			);

			await jiraService.submitDesigns(
				designs.map((design) => ({ design })),
				connectInstallation,
			);
		} catch (e: unknown) {
			if (e instanceof FigmaServiceCredentialsError) {
				await figmaTeamRepository.updateAuthStatus(
					figmaTeam.id,
					FigmaTeamAuthStatus.ERROR,
				);
			} else {
				throw e;
			}
		}
	},
};
