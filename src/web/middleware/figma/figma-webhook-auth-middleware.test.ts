import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { figmaWebhookAuthMiddleware } from './figma-webhook-auth-middleware';

import { flushPromises } from '../../../common/testing/utils';
import { generateFigmaTeam } from '../../../domain/entities/testing';
import { figmaTeamRepository } from '../../../infrastructure/repositories';
import { BadRequestResponseStatusError } from '../../errors';
import { generatePingWebhookEventRequestBody } from '../../routes/figma/testing';

describe('figmaWebhookAuthMiddleware', () => {
	it('should authenticate request and set figmaTeam in locals if request is authentic', async () => {
		const webhookId = uuidv4();
		const webhookPasscode = uuidv4();
		const figmaTeam = generateFigmaTeam({ webhookId, webhookPasscode });
		jest
			.spyOn(figmaTeamRepository, 'findByWebhookIdAndPasscode')
			.mockResolvedValue(figmaTeam);

		const request = {
			body: generatePingWebhookEventRequestBody({
				webhook_id: webhookId,
				passcode: webhookPasscode,
			}),
		} as Request;
		const response = {
			locals: {},
		} as Response;
		const next = jest.fn();

		figmaWebhookAuthMiddleware(request, response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith();
		expect(response.locals.figmaTeam).toBe(figmaTeam);
		expect(figmaTeamRepository.findByWebhookIdAndPasscode).toHaveBeenCalledWith(
			webhookId,
			webhookPasscode,
		);
	});

	it('should not authenticate request if request does not contain webhook credentials', async () => {
		const figmaTeam = generateFigmaTeam();
		jest
			.spyOn(figmaTeamRepository, 'findByWebhookIdAndPasscode')
			.mockResolvedValue(figmaTeam);

		const request = {} as Request;
		const next = jest.fn();

		figmaWebhookAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(
			expect.any(BadRequestResponseStatusError),
		);
	});

	it('should not authenticate request if webhook is not authentic', async () => {
		jest
			.spyOn(figmaTeamRepository, 'findByWebhookIdAndPasscode')
			.mockResolvedValue(null);

		const request = {
			body: generatePingWebhookEventRequestBody({
				webhook_id: uuidv4(),
				passcode: uuidv4(),
			}),
		} as Request;
		const next = jest.fn();

		figmaWebhookAuthMiddleware(request, {} as Response, next);
		await flushPromises();

		expect(next).toHaveBeenCalledWith(
			expect.any(BadRequestResponseStatusError),
		);
	});
});
