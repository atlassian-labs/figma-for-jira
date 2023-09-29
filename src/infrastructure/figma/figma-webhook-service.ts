import {
	FigmaWebhookServiceEventTypeValidationError,
	FigmaWebhookServicePasscodeValidationError,
} from './errors';

import {
	type FigmaTeam,
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

		return figmaTeam;
	};
}

export const figmaWebhookService = new FigmaWebhookService();
