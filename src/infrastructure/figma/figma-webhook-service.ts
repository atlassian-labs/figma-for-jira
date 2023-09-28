import {
	FigmaWebhookServiceAuthValidationError,
	FigmaWebhookServiceEventTypeValidationError,
	FigmaWebhookServicePasscodeValidationError,
} from './errors';
import { figmaService } from './figma-service';

import {
	type FigmaTeam,
	FigmaTeamAuthStatus,
	type FigmaWebhookEventType,
} from '../../domain/entities';
import { figmaTeamRepository } from '../repositories';

export class FigmaWebhookService {
	validateWebhookEvent = async (
		eventType: FigmaWebhookEventType,
		webhookId: string,
		passcode: string,
	): Promise<FigmaTeam> => {
		if (eventType !== 'FILE_UPDATE') {
			throw new FigmaWebhookServiceEventTypeValidationError(webhookId);
		}

		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);
		if (figmaTeam.webhookPasscode !== passcode) {
			throw new FigmaWebhookServicePasscodeValidationError(webhookId);
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
			throw new FigmaWebhookServiceAuthValidationError(webhookId);
		}

		return figmaTeam;
	};
}

export const figmaWebhookService = new FigmaWebhookService();
