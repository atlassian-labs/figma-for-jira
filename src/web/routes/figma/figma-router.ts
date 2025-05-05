import { HttpStatusCode } from 'axios';
import type { Response } from 'express';
import { Router } from 'express';

import {
	FIGMA_OAUTH2_CALLBACK_REQUEST_SCHEMA,
	FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA,
} from './schemas';
import type {
	FigmaOAuth2CallbackRequest,
	FigmaWebhookEventRequest,
	FigmaWebhookEventResponse,
} from './types';

import { getAppPath } from '../../../config';
import { getLogger } from '../../../infrastructure';
import { handleFigmaFileUpdateEvent } from '../../../jobs';
import { handleFigmaAuthorizationResponseUseCase } from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { figmaWebhookAuthMiddleware } from '../../middleware/figma/figma-webhook-auth-middleware';

export const SUCCESS_PAGE_URL = getAppPath('/static/auth-result/success');
export const FAILURE_PAGE_URL = getAppPath('/static/auth-result/failure');

export const figmaRouter = Router();

// If a 5xx response is returned while handling a webhook, Figma will
// retry sending the event up to 3 times at 5/30/180 minutes.
//
// see https://www.figma.com/developers/api#webhooks-v2-intro
figmaRouter.post(
	'/webhook',
	requestSchemaValidationMiddleware(FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
	figmaWebhookAuthMiddleware,
	(req: FigmaWebhookEventRequest, res: FigmaWebhookEventResponse) => {
		const { figmaTeam } = res.locals;

		switch (req.body.event_type) {
			case 'FILE_UPDATE': {
				// Making body its own variable so typescript is happy with the refinement
				// we did on the discriminated union
				const body = req.body;
				void setImmediate(
					() => void handleFigmaFileUpdateEvent(body, figmaTeam),
				);

				// Immediately send a 200 back to figma, before doing any of our own
				// async processing
				return res.sendStatus(HttpStatusCode.Ok);
			}
			default:
				return res.sendStatus(HttpStatusCode.Ok);
		}
	},
);

/**
 * A callback called by Figma authentication server with the access token included.
 *
 * @see https://www.figma.com/developers/api#authentication
 */
figmaRouter.get(
	'/oauth/callback',
	requestSchemaValidationMiddleware(FIGMA_OAUTH2_CALLBACK_REQUEST_SCHEMA),
	function (req: FigmaOAuth2CallbackRequest, res: Response) {
		const { code, state } = req.query;

		handleFigmaAuthorizationResponseUseCase
			.execute(code, state)
			.then(() => {
				res.redirect(SUCCESS_PAGE_URL);
			})
			.catch((error) => {
				getLogger().error(error, 'Figma OAuth 2.0 callback failed.');
				res.redirect(FAILURE_PAGE_URL);
			});
	},
);
