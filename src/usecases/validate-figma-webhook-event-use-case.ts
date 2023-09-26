import {
	type FigmaTeam,
	FigmaTeamAuthStatus,
	type FigmaWebhookEventType,
} from '../domain/entities';
import {
	figmaService,
	FigmaWebhookAuthValidationError,
	FigmaWebhookEventTypeValidationError,
	FigmaWebhookPasscodeValidationError,
} from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const validateFigmaWebhookEventUseCase = {
	execute: async (
		eventType: FigmaWebhookEventType,
		webhookId: string,
		passcode: string,
	): Promise<FigmaTeam> => {
		if (eventType !== 'FILE_UPDATE') {
			throw new FigmaWebhookEventTypeValidationError(webhookId);
		}

		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);
		if (figmaTeam.webhookPasscode !== passcode) {
			throw new FigmaWebhookPasscodeValidationError(webhookId);
		}

		// Ensure team admin OAuth2 credentials are still valid
		try {
			await figmaService.getValidCredentialsOrThrow(
				figmaTeam.figmaAdminAtlassianUserId,
			);
		} catch (e: unknown) {
			await figmaTeamRepository.updateAuthStatus(
				figmaTeam.id,
				FigmaTeamAuthStatus.ERROR,
			);
			throw new FigmaWebhookAuthValidationError(webhookId);
		}

		return figmaTeam;
	},
};
