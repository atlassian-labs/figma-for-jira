import type { NextFunction, Request, Response } from 'express';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';
import { assertSchema } from '../../../common/schema-validation';
import { figmaTeamRepository } from '../../../infrastructure/repositories';
import { BadRequestResponseStatusError } from '../../errors';

type FigmaWebhookCredentials = {
	readonly webhook_id: string;
	readonly passcode: string;
};

export const FIGMA_WEBHOOK_CREDENTIALS_SCHEMA: JSONSchemaTypeWithId<FigmaWebhookCredentials> =
	{
		$id: 'figma-api:webhook:v2:credentials',
		type: 'object',
		properties: {
			webhook_id: { type: 'string' },
			passcode: { type: 'string' },
		},
		required: ['webhook_id', 'passcode'],
	};

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
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		assertSchema(req.body, FIGMA_WEBHOOK_CREDENTIALS_SCHEMA);
	} catch (e) {
		return next(
			new BadRequestResponseStatusError('Cannot authenticate a webhook.'),
		);
	}

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
