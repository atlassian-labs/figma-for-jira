import { v4 as uuidv4 } from 'uuid';

import {
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
	PaidFigmaPlanRequiredUseCaseResultError,
} from './errors';

import type { ConnectInstallation, FigmaTeamSummary } from '../domain/entities';
import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	figmaService,
	InvalidInputFigmaServiceError,
	PaidPlanRequiredFigmaServiceError,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { ConfigurationState, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const connectFigmaTeamUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 * @throws {PaidFigmaPlanRequiredUseCaseResultError} A user does not have a Figma paid plan.
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

			await jiraService.setAppConfigurationState(
				ConfigurationState.CONFIGURED,
				connectInstallation,
			);

			return figmaTeam.toFigmaTeamSummary();
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			if (e instanceof PaidPlanRequiredFigmaServiceError) {
				throw new PaidFigmaPlanRequiredUseCaseResultError(e);
			}

			if (e instanceof InvalidInputFigmaServiceError) {
				throw new InvalidInputUseCaseResultError(e.message, e);
			}

			throw e;
		}
	},
};
