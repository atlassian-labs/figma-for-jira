import { HttpStatusCode } from 'axios';
import { Router } from 'express';

import { assertSchema } from '../../../infrastructure';
import { FIGMA_WEBHOOK_PAYLOAD_SCHEMA } from '../../../infrastructure/figma';
import { handleFigmaFileChangeEventUseCase } from '../../../usecases';

export const figmaRouter = Router();

figmaRouter.post('/webhook', (req, res, next) => {
	assertSchema(req.body, FIGMA_WEBHOOK_PAYLOAD_SCHEMA);

	const { event_type, file_key, webhook_id } = req.body;

	handleFigmaFileChangeEventUseCase
		.execute(webhook_id, file_key, event_type)
		// Figma docs specify that you should return a 200 OK if sucessful
		.then(() => res.sendStatus(HttpStatusCode.Ok))
		.catch(next);
});
