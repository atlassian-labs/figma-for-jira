import { HttpStatusCode } from 'axios';
import type { Response } from 'express';
import { Router } from 'express';

import {
	FIGMA_OAUTH_CALLBACK_QUERY_PARAMETERS_SCHEMA,
	FIGMA_WEBHOOK_PAYLOAD_SCHEMA,
} from './schemas';
import type { FigmaAuthCallbackRequest } from './types';

import { assertSchema, getLogger } from '../../../infrastructure';
import { figmaAuthService } from '../../../infrastructure/figma';
import { figmaWebhookService } from '../../../infrastructure/figma/figma-webhook-service';
import {
	addFigmaOAuthCredentialsUseCase,
	handleFigmaFileUpdateEventUseCase,
} from '../../../usecases';

const AUTH_RESOURCE_BASE_PATH = '/static/auth-result';
export const SUCCESS_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=true`;
export const FAILURE_PAGE_URL = `${AUTH_RESOURCE_BASE_PATH}?success=false`;

export const figmaRouter = Router();

// If a 5xx response is returned while handling a webhook, Figma will
// retry sending the event up to 3 times at 5/30/180 minutes.
//
// see https://www.figma.com/developers/api#webhooks-v2-intro
figmaRouter.post('/webhook', (req, res, next) => {
	assertSchema(req.body, FIGMA_WEBHOOK_PAYLOAD_SCHEMA);

	const { event_type, file_key, webhook_id, passcode } = req.body;

	figmaWebhookService
		.validateWebhookEvent(event_type, webhook_id, passcode)
		.then((figmaTeam) => {
			switch (event_type) {
				case 'FILE_UPDATE':
					return handleFigmaFileUpdateEventUseCase.execute(
						figmaTeam,
						file_key!,
					);
				default:
					return Promise.resolve();
			}
		})
		.then(() => {
			res.sendStatus(HttpStatusCode.Ok);
		})
		.catch(next);
});

/**
 * A callback called by Figma authentication server with the access token included.
 *
 * @see https://www.figma.com/developers/api#authentication
 */
figmaRouter.get(
	'/oauth/callback',
	function (req: FigmaAuthCallbackRequest, res: Response) {
		assertSchema(req.query, FIGMA_OAUTH_CALLBACK_QUERY_PARAMETERS_SCHEMA);
		const { code, state } = req.query;

		const user = figmaAuthService.getUserFromAuthorizationCallbackState(state);

		addFigmaOAuthCredentialsUseCase
			.execute(code, user)
			.then(() => {
				res.redirect(SUCCESS_PAGE_URL);
			})
			.catch((error) => {
				getLogger().error(error, 'Figma OAuth 2.0 callback failed.');
				res.redirect(FAILURE_PAGE_URL);
			});
	},
);
