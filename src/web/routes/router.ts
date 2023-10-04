import { HttpStatusCode } from 'axios';
import type { Request, Response } from 'express';
import { Router, static as Static } from 'express';

import { join } from 'path';

import { authRouter } from './auth';
import { entitiesRouter } from './entities';
import { figmaRouter } from './figma';
import { lifecycleEventsRouter } from './lifecycle-events';
import { teamsRouter } from './teams';

import { connectAppDescriptor } from '../../atlassian-connect';

export const rootRouter = Router();

// Healthcheck
rootRouter.get('/healthcheck', (_, res) => {
	res.status(HttpStatusCode.Ok).send('Server up and working.');
});

// Connect app manifest
rootRouter.get('/atlassian-connect.json', (_: Request, res: Response) => {
	res.status(HttpStatusCode.Ok).json(connectAppDescriptor);
});

// Static resources
rootRouter.use('/public', Static(join(process.cwd(), 'static')));

// Connect lifecycle events
rootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

rootRouter.use('/auth', authRouter);

rootRouter.use('/entities', entitiesRouter);

rootRouter.use('/teams', teamsRouter);

// Endpoints to handle requests from Figma
rootRouter.use('/figma', figmaRouter);
