import type { FigmaTeam, FigmaWebhookEventType } from '../domain/entities';
import {
	FigmaWebhookEventTypeValidationError,
	FigmaWebhookPasscodeValidationError,
} from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

export const validateWebhookPayloadUseCase = {
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

		return figmaTeam;
	},
};
