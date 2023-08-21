import { Router, static as Static } from 'express';

import { join } from 'path';

import { InstalledUseCase } from 'src/usecases/installed';

import { connectDescriptorGet } from './atlassian-connect';
import { authRouter } from './auth';
import { makeLifecycleRouter } from './lifecycle-events';

export const makeRootRouter = (installedUseCase: InstalledUseCase): Router => {
	const RootRouter = Router();

	// Healthcheck
	RootRouter.get('/healthcheck', (_req, res) =>
		res.status(200).send('Server up and working.'),
	);

	// Static resources
	RootRouter.use('/public', Static(join(process.cwd(), 'static')));

	// Connect app manifest
	RootRouter.get('/atlassian-connect.json', connectDescriptorGet);

	// Connect lifecycle events
	RootRouter.use('/lifecycleEvents', makeLifecycleRouter(installedUseCase));

	RootRouter.use('/auth', authRouter);

	return RootRouter;
};
