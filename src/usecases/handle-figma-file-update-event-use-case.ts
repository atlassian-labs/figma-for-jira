import { getFeatureFlag, getLDClient } from '../config/launch_darkly';
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

	const designs = await figmaService.getAvailableDesignsFromSameFile(
		associatedFigmaDesigns.map((design) => design.designId),
		adminInfo,
	);

	if (!designs.length) return;

	await jiraService.submitDesigns(designs, connectInstallation);
}
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
				const ldClient = await getLDClient();
				const useFileWebhooks = await getFeatureFlag(
					ldClient,
					'ext_figma_for_jira_use_file_webhooks',
					false,
				);
				if (!useFileWebhooks) {
					return;
				}

				const figmaFileWebhook = webhookInfo.figmaFileWebhook;
				return await syncDesignsToJira(
					fileKey,
					figmaFileWebhook.connectInstallationId,
					figmaFileWebhook.creatorInfo,
				);
			}
		}
	},
};
