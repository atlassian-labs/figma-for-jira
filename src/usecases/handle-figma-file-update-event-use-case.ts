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
			designs = await figmaService.getAvailableDesignsFromSameFile(
				associatedFigmaDesigns,
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

		if (!designs.length) return;

		// Update the timestamp for all the designs attached to a node
		await Promise.all([
			await jiraService.submitDesigns(
				designs.map((design) => ({ design })),
				connectInstallation,
			),
			designs
				.map((design) => {
					const associatedFigmaDesign = associatedFigmaDesigns.find(
						(associatedFigmaDesign) =>
							// Find the matching associatedFigmaDesign
							design.id ===
								associatedFigmaDesign.designId.toAtlassianDesignId() &&
							// Exclude associatedFigmaDesigns with no nodeId
							associatedFigmaDesign.designId.nodeId != null,
					);
					return { design, associatedFigmaDesign } as const;
				})
				.map(({ design, associatedFigmaDesign }) => {
					if (!associatedFigmaDesign) {
						return;
					}

					return associatedFigmaDesignRepository.upsert({
						...associatedFigmaDesign,
						devStatus: design.status,
						lastUpdated: design.lastUpdated,
					});
				}),
		]);
	},
};
