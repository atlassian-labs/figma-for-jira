import { v4 as uuidv4 } from 'uuid';

import { ForbiddenByFigmaUseCaseError } from './errors';

import type { ConnectInstallation, FigmaTeamSummary } from '../domain/entities';
import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { ConfigurationStatus, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const connectFigmaTeamUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseError} Not authorized to access Figma.
	 */
	execute: async (
		teamId: string,
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<FigmaTeamSummary> => {
		try {
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

			const figmaTeam = await figmaTeamRepository.upsert({
				webhookId,
				webhookPasscode,
				teamId: figmaTeamId,
				teamName,
				figmaAdminAtlassianUserId: atlassianUserId,
				authStatus: FigmaTeamAuthStatus.OK,
				connectInstallationId: connectInstallation.id,
			});

			await jiraService.setAppConfigurationStatus(
				ConfigurationStatus.CONFIGURED,
				connectInstallation,
			);

			return figmaTeam.toFigmaTeamSummary();
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseError({ cause: e });
			}

			throw e;
		}
	},
};
