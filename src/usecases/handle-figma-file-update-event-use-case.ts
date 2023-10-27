import type { AtlassianDesign, FigmaTeam } from '../domain/entities';
import { FigmaTeamAuthStatus } from '../domain/entities';
import { getLogger } from '../infrastructure';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
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
				figmaTeam.adminInfo,
			);
			await figmaTeamRepository.updateTeamName(figmaTeam.id, teamName);
		} catch (e: unknown) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				return figmaTeamRepository.updateAuthStatus(
					figmaTeam.id,
					FigmaTeamAuthStatus.ERROR,
				);
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

		if (!associatedFigmaDesigns.length) return;

		let designs: AtlassianDesign[];

		try {
			designs = await figmaService.fetchDesignsByIds(
				associatedFigmaDesigns.map((design) => design.designId),
				figmaTeam.adminInfo,
			);
		} catch (e: unknown) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				return figmaTeamRepository.updateAuthStatus(
					figmaTeam.id,
					FigmaTeamAuthStatus.ERROR,
				);
			}
			throw e;
		}

		await jiraService.submitDesigns(
			designs.map((design) => ({ design })),
			connectInstallation,
		);
	},
};
