import { v4 as uuidv4 } from 'uuid';

import { validateFigmaWebhookEventUseCase } from './validate-figma-webhook-event-use-case';

import type { FigmaWebhookEventType } from '../domain/entities';
import { generateFigmaTeam } from '../domain/entities/testing';
import {
	figmaService,
	FigmaWebhookAuthValidationError,
	FigmaWebhookEventTypeValidationError,
	FigmaWebhookPasscodeValidationError,
} from '../infrastructure/figma';
import { figmaTeamRepository } from '../infrastructure/repositories';

describe('validateFigmaWebhookEventUseCase', () => {
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

			jest.spyOn(figmaTeamRepository, 'getByWebhookId');
			jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

			await expect(
				validateFigmaWebhookEventUseCase.execute(
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
		const expectedError = new FigmaWebhookPasscodeValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest.spyOn(figmaService, 'getValidCredentialsOrThrow');

		await expect(
			validateFigmaWebhookEventUseCase.execute(
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
		const expectedError = new FigmaWebhookAuthValidationError(webhookId);

		jest
			.spyOn(figmaTeamRepository, 'getByWebhookId')
			.mockResolvedValue(figmaTeam);
		jest
			.spyOn(figmaService, 'getValidCredentialsOrThrow')
			.mockRejectedValue(new Error('auth error'));

		await expect(
			validateFigmaWebhookEventUseCase.execute(
				eventType,
				webhookId,
				figmaTeam.webhookPasscode,
			),
		).rejects.toStrictEqual(expectedError);
	});
});
