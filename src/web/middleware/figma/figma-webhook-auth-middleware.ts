import type { NextFunction, Response } from 'express';

import { assertSchema } from '../../../common/schema-validation';
import { figmaTeamRepository } from '../../../infrastructure/repositories';
import { BadRequestResponseStatusError } from '../../errors';
import type { FigmaWebhookEventRequest } from '../../routes/figma';
import { FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA } from '../../routes/figma';

/**
 * Compares the given passcode with the passcode originally provided when creating the webhook
 * to make sure they match before acting on the webhook trigger.
 *
 * If passcodes do not match, return "400 Bad Request" according to the Figma's security recommendation.
 *
 * @remarks
 * Ensure that the request schema is validated before reaching this middleware.
 *
 * @see https://www.figma.com/developers/api#webhooks-v2-security
 */
export const figmaWebhookAuthMiddleware = (
	req: FigmaWebhookEventRequest,
	res: Response,
	next: NextFunction,
) => {
	assertSchema(req, FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA);

	const { webhook_id, passcode } = req.body;

	void figmaTeamRepository
		.findByWebhookIdAndPasscode(webhook_id, passcode)
		.then((figmaTeam) => {
			if (figmaTeam === null)
				return next(
					new BadRequestResponseStatusError('Unexpected webhook event.'),
				);

			res.locals.figmaTeam = figmaTeam;
			next();
		})
		.catch(next);
};
