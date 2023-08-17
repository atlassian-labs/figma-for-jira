import { Router, static as Static } from 'express';
import { join } from 'path';

import { connectDescriptorGet } from './atlassian-connect';
import { authRouter } from './auth';
import { lifecycleEventsRouter } from './lifecycle-events';

export const RootRouter = Router();

// Healthcheck
RootRouter.get('/healthcheck', (_req, res) =>
	res.status(200).send('Server up and working.'),
);

// Static resources
RootRouter.use('/public', Static(join(process.cwd(), 'static')));

// Connect app manifest
RootRouter.get('/atlassian-connect.json', connectDescriptorGet);

// Connect lifecycle events
RootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

RootRouter.use('/auth', authRouter);
