import { HttpStatusCode } from 'axios';
import { Router } from 'express';

import { FIGMA_WEBHOOK_PAYLOAD_SCHEMA } from './schemas';

import { assertSchema } from '../../../infrastructure';
import { webhookService } from '../../../infrastructure/webhook';
import { handleFigmaFileUpdateEventUseCase } from '../../../usecases';

export const figmaRouter = Router();

// If a 5xx response is returned while handling a webhook, Figma will
// retry sending the event up to 3 times at 5/30/180 minutes.
//
// see https://www.figma.com/developers/api#webhooks-v2-intro
figmaRouter.post('/webhook', (req, res, next) => {
	assertSchema(req.body, FIGMA_WEBHOOK_PAYLOAD_SCHEMA);

	const { event_type, file_key, webhook_id, passcode } = req.body;

	webhookService
		.validateFigmaWebhookEvent(event_type, webhook_id, passcode)
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
