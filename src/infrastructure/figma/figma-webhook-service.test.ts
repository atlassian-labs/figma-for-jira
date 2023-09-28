import { v4 as uuidv4 } from 'uuid';

import {
	FigmaWebhookServiceAuthValidationError,
	FigmaWebhookServiceEventTypeValidationError,
	FigmaWebhookServicePasscodeValidationError,
} from './errors';
import { figmaService } from './figma-service';
import { figmaWebhookService } from './figma-webhook-service';

import type { FigmaWebhookEventType } from '../../domain/entities';
import { generateFigmaTeam } from '../../domain/entities/testing';
import { figmaTeamRepository } from '../repositories';

describe('FigmaWebhookService', () => {
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
			const expectedError = new FigmaWebhookServiceEventTypeValidationError(
				webhookId,
			);

			jest.spyOn(figmaTeamRepository, 'getByWebhookId');
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

			await expect(
				figmaWebhookService.validateWebhookEvent(
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
		const expectedError = new FigmaWebhookServicePasscodeValidationError(
			webhookId,
		);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

		await expect(
			figmaWebhookService.validateWebhookEvent(
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
		const expectedError = new FigmaWebhookServiceAuthValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaTeamRepository, 'updateAuthStatus').mockResolvedValue();
		jest
			.spyOn(figmaService, 'getValidCredentialsOrThrow')
			.mockRejectedValue(new Error('auth error'));

		await expect(
			figmaWebhookService.validateWebhookEvent(
				eventType,
				webhookId,
				figmaTeam.webhookPasscode,
			),
		).rejects.toStrictEqual(expectedError);
	});
});
