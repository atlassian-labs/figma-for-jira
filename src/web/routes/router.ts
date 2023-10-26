import { HttpStatusCode } from 'axios';
import type { Request, Response } from 'express';
import { Router, static as Static } from 'express';

import { join } from 'path';

import { adminRouter } from './admin';
import { authRouter } from './auth';
import { entitiesRouter } from './entities';
import { figmaRouter } from './figma';
import { lifecycleEventsRouter } from './lifecycle-events';

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
rootRouter.use('/static/admin', Static(join(process.cwd(), 'admin/dist')));
rootRouter.use('/static', Static(join(process.cwd(), 'static')));

// Connect lifecycle events
rootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

rootRouter.use('/admin', adminRouter);

rootRouter.use('/auth', authRouter);

rootRouter.use('/entities', entitiesRouter);

// Endpoints to handle requests from Figma
rootRouter.use('/figma', figmaRouter);
