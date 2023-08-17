import { join } from 'path';
import { Router, static as Static } from 'express';
import { connectDescriptorGet } from './atlassian-connect';
import { lifecycleEventsRouter } from './lifecycle-events';
import { authRouter } from './auth';

export const RootRouter = Router();

// Root page
RootRouter.get('/', (_req, res) =>
	res.status(200).send('Server up and working.'),
);

// Static resources
RootRouter.use('/public', Static(join(process.cwd(), 'static')));

// Connect app manifest
RootRouter.get('/atlassian-connect.json', connectDescriptorGet);

// Connect lifecycle events
RootRouter.use('/lifecycleEvents', lifecycleEventsRouter);

RootRouter.use('/auth', authRouter);
