import { v4 as uuidv4 } from 'uuid';

import {
	WebhookServiceAuthValidationError,
	WebhookServiceEventTypeValidationError,
	WebhookServicePasscodeValidationError,
} from './errors';
import { webhookService } from './webhook-service';

import type { FigmaWebhookEventType } from '../../domain/entities';
import { generateFigmaTeam } from '../../domain/entities/testing';
import { figmaService } from '../figma';
import { figmaTeamRepository } from '../repositories';

describe('WebhookService', () => {
	it.each([
		'PING',
		'FILE_VERSION_UPDATE',
		'FILE_DELETE',
		'LIBRARY_PUBLISH',
		'FILE_COMMENT',
	] as FigmaWebhookEventType[])(
		'should throw a WebhookServiceEventTypeValidationError for unsupported event types',
		async (eventType: FigmaWebhookEventType) => {
			const webhookId = uuidv4();
			const passcode = uuidv4();
			const expectedError = new WebhookServiceEventTypeValidationError(
				webhookId,
			);

			jest.spyOn(figmaTeamRepository, 'getByWebhookId');
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

			await expect(
				webhookService.validateFigmaWebhookEvent(
					eventType,
					webhookId,
					passcode,
				),
			).rejects.toStrictEqual(expectedError);
			expect(figmaTeamRepository.getByWebhookId).not.toBeCalled();
			expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
		},
	);

	it('should throw a FigmaWebhookPasscodeValidationError if passcode is invalid', async () => {
		const eventType: FigmaWebhookEventType = 'FILE_UPDATE';
		const webhookId = uuidv4();
		const invalidPasscode = uuidv4();
		const figmaTeam = generateFigmaTeam({ webhookId });
		const expectedError = new WebhookServicePasscodeValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

		await expect(
			webhookService.validateFigmaWebhookEvent(
				eventType,
				webhookId,
				invalidPasscode,
			),
		).rejects.toStrictEqual(expectedError);
		expect(figmaService.getValidCredentialsOrThrow).not.toBeCalled();
	});

	it('should throw a FigmaWebhookAuthValidationError if team admin auth is invalid', async () => {
		const eventType: FigmaWebhookEventType = 'FILE_UPDATE';
		const webhookId = uuidv4();
		const figmaTeam = generateFigmaTeam({ webhookId });
		const expectedError = new WebhookServiceAuthValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest
			.spyOn(figmaService, 'getValidCredentialsOrThrow')
			.mockRejectedValue(new Error('auth error'));

		await expect(
			webhookService.validateFigmaWebhookEvent(
				eventType,
				webhookId,
				figmaTeam.webhookPasscode,
			),
		).rejects.toStrictEqual(expectedError);
	});
});
