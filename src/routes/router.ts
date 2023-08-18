import { Router } from 'express';
import { connectDescriptorGet } from './atlassian-connect';
import { lifecycleEventsRouter } from './lifecycle-events';
import { authRouter } from './auth';

export const RootRouter = Router();

// Healthcheck
RootRouter.get('/healthcheck', (_req, res) =>
	res.status(200).send('Server up and working.'),
);

// Connect app manifest
RootRouter.get('/atlassian-connect.json', connectDescriptorGet);

// Connect lifecycle events
RootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

RootRouter.use('/auth', authRouter);
