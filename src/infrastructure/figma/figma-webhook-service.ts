import { ValidationError } from '../../common/errors';
import { type FigmaTeam } from '../../domain/entities';
import { figmaTeamRepository } from '../repositories';

export class FigmaWebhookService {
	validateWebhookEvent = async (
		webhookId: string,
		passcode: string,
	): Promise<FigmaTeam> => {
		const figmaTeam = await figmaTeamRepository.getByWebhookId(webhookId);
		if (figmaTeam.webhookPasscode !== passcode) {
			throw new ValidationError(
				`Received webhook event for ${webhookId} with invalid passcode.`,
			);
		}

		return figmaTeam;
	};
}

export const figmaWebhookService = new FigmaWebhookService();
