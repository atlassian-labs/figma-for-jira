import { HttpStatusCode } from 'axios';
import type { Response } from 'express';
import { Router } from 'express';

import {
	FIGMA_OAUTH2_CALLBACK_REQUEST_SCHEMA,
	FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA,
} from './schemas';
import type { FigmaOAuth2CallbackRequest, FigmaWebhookRequest } from './types';

import { getLogger } from '../../../infrastructure';
import { figmaWebhookService } from '../../../infrastructure/figma/figma-webhook-service';
import {
	handleFigmaAuthorizationResponseUseCase,
	handleFigmaFileUpdateEventUseCase,
} from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';

const AUTH_RESOURCE_BASE_PATH = '/static/auth-result';
export const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
export const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

export const figmaRouter = Router();

// If a 5xx response is returned while handling a webhook, Figma will
// retry sending the event up to 3 times at 5/30/180 minutes.
//
// see https://www.figma.com/developers/api#webhooks-v2-intro
figmaRouter.post(
	'/webhook',
	requestSchemaValidationMiddleware(FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
	(req: FigmaWebhookRequest, res, next) => {
		const { event_type, file_key, webhook_id, passcode } = req.body;

		switch (event_type) {
			case 'FILE_UPDATE':
				figmaWebhookService
					.validateWebhookEvent(webhook_id, passcode)
					.then((figmaTeam) =>
						handleFigmaFileUpdateEventUseCase.execute(figmaTeam, file_key!),
					)
					.then(() => res.sendStatus(HttpStatusCode.Ok))
					.catch(next);
				return;
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
