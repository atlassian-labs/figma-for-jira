import { HttpStatusCode } from 'axios';
import { Router, static as Static } from 'express';

import { join } from 'path';

import { connectDescriptorGet } from './atlassian-connect';
import { authRouter } from './auth';
import { entitiesRouter } from './entities';
import { figmaRouter } from './figma';
import { lifecycleEventsRouter } from './lifecycle-events';
import { teamsRouter } from './teams';

export const rootRouter = Router();

// Healthcheck
rootRouter.get('/healthcheck', (_req, res) =>
	res.status(HttpStatusCode.Ok).send('Server up and working.'),
);

// Static resources
rootRouter.use('/public', Static(join(process.cwd(), 'static')));

// Connect app manifest
rootRouter.get('/atlassian-connect.json', connectDescriptorGet);

// Connect lifecycle events
rootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

rootRouter.use('/auth', authRouter);

rootRouter.use('/entities', entitiesRouter);

rootRouter.use('/teams', teamsRouter);

// Endpoints to handle requests from Figma
rootRouter.use('/figma', figmaRouter);
