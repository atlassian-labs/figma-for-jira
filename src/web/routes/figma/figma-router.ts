import { HttpStatusCode } from 'axios';
import type { Response } from 'express';
import { Router } from 'express';

import {
	FIGMA_OAUTH2_CALLBACK_REQUEST_SCHEMA,
	FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA,
} from './schemas';
import type {
	FigmaFileWebhookEventRequest,
	FigmaFileWebhookEventResponse,
	FigmaOAuth2CallbackRequest,
	FigmaTeamWebhookEventRequest,
	FigmaTeamWebhookEventResponse,
	FigmaWebhookInfo,
} from './types';

import { buildAppUrl } from '../../../config';
import { getLogger } from '../../../infrastructure';
import { handleFigmaFileUpdateEvent } from '../../../jobs';
import { handleFigmaAuthorizationResponseUseCase } from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
import {
	figmaFileWebhookAuthMiddleware,
	figmaTeamWebhookAuthMiddleware,
} from '../../middleware/figma/figma-webhook-auth-middleware';

const SUCCESS_PAGE_RELATIVE_URL = 'static/auth-result/success';
const FAILURE_PAGE_RELATIVE_URL = 'static/auth-result/failure';

export const figmaRouter = Router();

// If a 5xx response is returned while handling a webhook, Figma will
// retry sending the event up to 3 times at 5/30/180 minutes.
//
// see https://www.figma.com/developers/api#webhooks-v2-intro
figmaRouter.post(
	'/webhook',
	requestSchemaValidationMiddleware(FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
	figmaTeamWebhookAuthMiddleware,
	(req: FigmaTeamWebhookEventRequest, res: FigmaTeamWebhookEventResponse) => {
		const { figmaTeam } = res.locals;

		switch (req.body.event_type) {
			case 'FILE_UPDATE': {
				// Making body its own variable so typescript is happy with the refinement
				// we did on the discriminated union
				const body = req.body;
				void setImmediate(
					() =>
						void handleFigmaFileUpdateEvent(body, {
							figmaTeam,
							webhookType: 'team',
						}),
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

// Handles FILE_UPDATE and DEV_MODE_STATUS_UPDATE webhookevents for a specific file
figmaRouter.post(
	'/webhook/file',
	requestSchemaValidationMiddleware(FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA),
	figmaFileWebhookAuthMiddleware,
	(req: FigmaFileWebhookEventRequest, res: FigmaFileWebhookEventResponse) => {
		const { figmaFileWebhook } = res.locals;

		const webhookInfo: FigmaWebhookInfo = {
			figmaFileWebhook,
			webhookType: 'file',
		};

		switch (req.body.event_type) {
			case 'FILE_UPDATE': {
				// Making body its own variable so typescript is happy with the refinement
				// we did on the discriminated union
				const body = req.body;
				void setImmediate(
					() => void handleFigmaFileUpdateEvent(body, webhookInfo),
				);

				// Immediately send a 200 back to figma, before doing any of our own
				// async processing
				return res.sendStatus(HttpStatusCode.Ok);
			}
			case 'DEV_MODE_STATUS_UPDATE': {
				const body = req.body;
				void setImmediate(
					() => void handleFigmaFileUpdateEvent(body, webhookInfo),
				);
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
				const redirectUrl = buildAppUrl(SUCCESS_PAGE_RELATIVE_URL);
				res.redirect(redirectUrl.toString());
			})
			.catch((error) => {
				getLogger().error(error, 'Figma OAuth 2.0 callback failed.');
				const redirectUrl = buildAppUrl(FAILURE_PAGE_RELATIVE_URL);
				res.redirect(redirectUrl.toString());
			});
	},
);
