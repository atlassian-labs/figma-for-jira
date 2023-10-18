import { v4 as uuidv4 } from 'uuid';

import { figmaWebhookService } from './figma-webhook-service';

import { ValidationError } from '../../common/errors';
import { generateFigmaTeam } from '../../domain/entities/testing';
import { figmaTeamRepository } from '../repositories';

describe('FigmaWebhookService', () => {
	it('should throw a ValidationError if passcode is invalid', async () => {
		const webhookId = uuidv4();
		const invalidPasscode = uuidv4();
		const figmaTeam = generateFigmaTeam({ webhookId });
		const expectedError = new ValidationError(
			`Received webhook event for ${webhookId} with invalid passcode.`,
		);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);

		await expect(
			figmaWebhookService.validateWebhookEvent(webhookId, invalidPasscode),
		).rejects.toStrictEqual(expectedError);
	});
});
