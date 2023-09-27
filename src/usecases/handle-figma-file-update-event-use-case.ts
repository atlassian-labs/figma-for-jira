import type { FigmaTeam } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import {
	associatedFigmaDesignRepository,
	connectInstallationRepository,
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
