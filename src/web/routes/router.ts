import { HttpStatusCode } from 'axios';
import type { Request, Response } from 'express';
import { Router } from 'express';

import { adminRouter } from './admin';
import { authRouter } from './auth';
import { entitiesRouterV2 } from './entities-v2';
import { figmaRouter } from './figma';
import { lifecycleEventsRouter } from './lifecycle-events';
import { staticRouter } from './static';

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
rootRouter.use('/static', staticRouter);

// Connect lifecycle events
rootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

rootRouter.use('/admin', adminRouter);

rootRouter.use('/auth', authRouter);

rootRouter.use('/entities', entitiesRouterV2);

// Endpoints to handle requests from Figma
rootRouter.use('/figma', figmaRouter);
