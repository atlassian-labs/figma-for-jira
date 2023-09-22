import { HttpStatusCode } from 'axios';
import { Router } from 'express';

import { FIGMA_WEBHOOK_PAYLOAD_SCHEMA } from './schemas';

import { assertSchema } from '../../../infrastructure';
import { handleFigmaFileUpdateEventUseCase } from '../../../usecases';

export const figmaRouter = Router();

figmaRouter.post('/webhook', (req, res, next) => {
	assertSchema(req.body, FIGMA_WEBHOOK_PAYLOAD_SCHEMA);

	const { event_type, file_key, webhook_id, passcode } = req.body;

	// If a non-200 response is returned while handling a webhook, Figma will
	// retry sending the event up to 3 times at 5/30/180 minutes.
	//
	// see https://www.figma.com/developers/api#webhooks-v2-intro
	switch (event_type) {
		case 'FILE_UPDATE':
			handleFigmaFileUpdateEventUseCase
				.execute(webhook_id, file_key, passcode)
				.then(() => res.sendStatus(HttpStatusCode.Ok))
				.catch(next);
			break;
		default:
			res.sendStatus(HttpStatusCode.Ok);
	}
});
