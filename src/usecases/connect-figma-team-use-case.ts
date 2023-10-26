import { v4 as uuidv4 } from 'uuid';

import { FigmaTeamAuthStatus } from '../domain/entities';
import type { ConnectInstallation, FigmaTeamSummary } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { ConfigurationState, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const connectFigmaTeamUseCase = {
	execute: async (
		teamId: string,
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<FigmaTeamSummary> => {
		const webhookPasscode = uuidv4();

		const teamName = await figmaService.getTeamName(teamId, {
			atlassianUserId,
			connectInstallationId: connectInstallation.id,
		});

		const { webhookId, teamId: figmaTeamId } =
			await figmaService.createFileUpdateWebhook(teamId, webhookPasscode, {
				atlassianUserId,
				connectInstallationId: connectInstallation.id,
			});

		const teamSummary = await figmaTeamRepository.upsert({
			webhookId,
			webhookPasscode,
			teamId: figmaTeamId,
			teamName,
			figmaAdminAtlassianUserId: atlassianUserId,
			authStatus: FigmaTeamAuthStatus.OK,
			connectInstallationId: connectInstallation.id,
		});

		await jiraService.setConfigurationStateInAppProperties(
			ConfigurationState.CONFIGURED,
			connectInstallation,
		);

		return teamSummary;
	},
};
