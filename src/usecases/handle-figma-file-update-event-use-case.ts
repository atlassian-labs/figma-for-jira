import type { FigmaTeam } from '../domain/entities';
import { getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
	figmaTeamRepository,
} from '../infrastructure/repositories';

export const handleFigmaFileUpdateEventUseCase = {
	execute: async (figmaTeam: FigmaTeam, fileKey: string): Promise<void> => {
		try {
			const teamName = await figmaService.getTeamName(figmaTeam.teamId, {
				atlassianUserId: figmaTeam.figmaAdminAtlassianUserId,
				connectInstallationId: figmaTeam.connectInstallationId,
			});
			await figmaTeamRepository.updateTeamName(figmaTeam.id, teamName);
		} catch (e: unknown) {
			getLogger().warn(e, `Failed to sync team name for ${figmaTeam.id}`);
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
				figmaService.fetchDesignById(design.designId, {
					atlassianUserId: figmaTeam.figmaAdminAtlassianUserId,
					connectInstallationId: figmaTeam.connectInstallationId,
				}),
			),
		);

		await jiraService.submitDesigns(
			designs.map((design) => ({ design })),
			connectInstallation,
		);
	},
};
