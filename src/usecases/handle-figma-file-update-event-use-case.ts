import type {
	AssociatedFigmaDesign,
	AtlassianDesign,
	FigmaTeam,
} from '../domain/entities';
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

		if (associatedFigmaDesigns.length === 0) {
			return;
		}

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

		if (designs.length === 0) {
			return;
		}

		// Update the timestamp and devStatus for all the designs attached to a node
		const updatedAssociatedFigmaDesigns = designs
			.map((design) => {
				const associatedFigmaDesign = associatedFigmaDesigns.find(
					(associatedFigmaDesign) =>
						// Find the matching associatedFigmaDesign
						design.id ===
							associatedFigmaDesign.designId.toAtlassianDesignId() &&
						// Exclude associatedFigmaDesigns with no nodeId
						associatedFigmaDesign.designId.nodeId != null,
				);
				return [design, associatedFigmaDesign] as [
					AtlassianDesign,
					AssociatedFigmaDesign | undefined,
				];
			})
			.filter(
				(
					pair: [AtlassianDesign, AssociatedFigmaDesign | undefined],
				): pair is [AtlassianDesign, AssociatedFigmaDesign] => pair[1] != null,
			)
			.map(([design, associatedFigmaDesign]) => ({
				...associatedFigmaDesign,
				// Update with the corresponding status and lastUpdated values
				devStatus: design.status,
				lastUpdated: design.lastUpdated,
			}));

		await Promise.all([
			await jiraService.submitDesigns(
				designs.map((design) => ({ design })),
				connectInstallation,
			),
			await associatedFigmaDesignRepository.upsertMany(
				updatedAssociatedFigmaDesigns,
			),
		]);
	},
};
