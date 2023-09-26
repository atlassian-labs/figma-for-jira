import { v4 as uuidv4 } from 'uuid';

import { validateWebhookPayloadUseCase } from './validate-webhook-payload-use-case';

import type { FigmaWebhookEventType } from '../domain/entities';
import { generateFigmaTeam } from '../domain/entities/testing';
import {
	FigmaWebhookEventTypeValidationError,
	FigmaWebhookPasscodeValidationError,
} from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('validateWebhookPayloadUseCase', () => {
	it.each([
		'PING',
		'FILE_VERSION_UPDATE',
		'FILE_DELETE',
		'LIBRARY_PUBLISH',
		'FILE_COMMENT',
	] as FigmaWebhookEventType[])(
		'should throw a FigmaWebhookEventTypeValidationError for unsupported event types',
		async (eventType: FigmaWebhookEventType) => {
			const webhookId = uuidv4();
			const passcode = uuidv4();
			const expectedError = new FigmaWebhookEventTypeValidationError(webhookId);

			await expect(
				validateWebhookPayloadUseCase.execute(eventType, webhookId, passcode),
			).rejects.toStrictEqual(expectedError);
		},
	);

	it('should throw a FigmaWebhookPasscodeValidationError if passcode is invalid', async () => {
		const eventType: FigmaWebhookEventType = 'FILE_UPDATE';
		const webhookId = uuidv4();
		const invalidPasscode = uuidv4();
		const figmaTeam = generateFigmaTeam({ webhookId });
		const expectedError = new FigmaWebhookPasscodeValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);

		await expect(
			validateWebhookPayloadUseCase.execute(
				eventType,
				webhookId,
				invalidPasscode,
			),
		).rejects.toStrictEqual(expectedError);
	});
});
