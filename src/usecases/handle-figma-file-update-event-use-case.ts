import { uniqueWith } from '../common/array-utils';
import type { ConnectUserInfo } from '../domain/entities';
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
import type { FigmaWebhookInfo } from '../web/routes/figma';

export const handleFigmaFileUpdateEventUseCase = {
	execute: async (
		webhookInfo: FigmaWebhookInfo,
		fileKey: string,
	): Promise<void> => {
		switch (webhookInfo.webhookType) {
			case 'team': {
				const figmaTeam = webhookInfo.figmaTeam;
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

				try {
					await syncDesignsToJira(
						fileKey,
						figmaTeam.connectInstallationId,
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

				return;
			}

			case 'file': {
				const figmaFileWebhook = webhookInfo.figmaFileWebhook;
				return await syncDesignsToJira(
					fileKey,
					figmaFileWebhook.createdBy.connectInstallationId,
					figmaFileWebhook.createdBy,
				);
			}
		}
	},
};

async function syncDesignsToJira(
	fileKey: string,
	connectInstallationId: string,
	adminInfo: ConnectUserInfo,
): Promise<void> {
	const [connectInstallation, associatedFigmaDesigns] = await Promise.all([
		connectInstallationRepository.get(connectInstallationId),
		associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
			fileKey,
			connectInstallationId,
		),
	]);

	if (!associatedFigmaDesigns.length) return;

	const atlassianDesignIds = associatedFigmaDesigns.map((x) => x.designId);
	const uniqueDesignIds = uniqueWith(atlassianDesignIds, (x, y) => x.equal(y));

	const designs = await figmaService.getAvailableDesignsFromSameFile(
		uniqueDesignIds,
		adminInfo,
	);

	if (!designs.length) return;

	await jiraService.submitDesigns(designs, connectInstallation);
}
