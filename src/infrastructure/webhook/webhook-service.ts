import {
	WebhookServiceAuthValidationError,
	WebhookServiceEventTypeValidationError,
	WebhookServicePasscodeValidationError,
} from './errors';

import {
	type FigmaTeam,
	FigmaTeamAuthStatus,
	type FigmaWebhookEventType,
} from '../../domain/entities';
import { figmaService } from '../figma';
import { figmaTeamRepository } from '../repositories';

export class WebhookService {
	validateFigmaWebhookEvent = async (
		eventType: FigmaWebhookEventType,
		webhookId: string,
		passcode: string,
	): Promise<FigmaTeam> => {
		if (eventType !== 'FILE_UPDATE') {
			throw new WebhookServiceEventTypeValidationError(webhookId);
		}

		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);
		if (figmaTeam.webhookPasscode !== passcode) {
			throw new WebhookServicePasscodeValidationError(webhookId);
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
			throw new WebhookServiceAuthValidationError(webhookId);
		}

		return figmaTeam;
	};
}

export const webhookService = new WebhookService();
