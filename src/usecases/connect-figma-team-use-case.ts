import { v4 as uuidv4 } from 'uuid';

import {
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';

import type { ConnectInstallation, FigmaTeamSummary } from '../domain/entities';
import { FigmaTeamAuthStatus } from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { BadRequestHttpClientError } from '../infrastructure/http-client-errors';
import { ConfigurationState, jiraService } from '../infrastructure/jira';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const connectFigmaTeamUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
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
				if (e.cause instanceof BadRequestHttpClientError) {
					throw new InvalidInputUseCaseResultError(
						e.cause?.response?.reason ?? '',
					);
				}
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
