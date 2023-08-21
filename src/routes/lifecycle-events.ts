import { RequestHandler, Router } from 'express';

import type { TypedRequest } from './types';

import { ConnectInstallationCreateParams } from '../domain/entities/connect-installations';
import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';
import {
	authHeaderAsymmetricJwtMiddleware,
	authHeaderSymmetricJwtMiddleware,
} from '../middlewares/auth-header-jwt-middleware';
import { installedUseCase } from '../usecases/installed';

type ConnectLifecycleEventRequestBody = {
	key: string;
	clientKey: string;
	sharedSecret: string;
	baseUrl: string;
	displayUrl?: string;
};

export function makeLifecycleRouter(
	connectInstallationRepository: ConnectInstallationRepository,
): Router {
	const lifecycleEventsRouter = Router();

	lifecycleEventsRouter.post(
		'/installed',
		authHeaderAsymmetricJwtMiddleware,
		(req: TypedRequest<ConnectLifecycleEventRequestBody>, res, next) => {
			const installation: ConnectInstallationCreateParams = {
				key: req.body.key,
				clientKey: req.body.clientKey,
				sharedSecret: req.body.sharedSecret,
				baseUrl: req.body.baseUrl,
				// displayUrl should be set to baseUrl if value is not present in request
				displayUrl: req.body.displayUrl ?? req.body.baseUrl,
			};
			installedUseCase(connectInstallationRepository, installation).catch(next);
			res.sendStatus(204);
		},
	);

	lifecycleEventsRouter.post(
		'/enabled',
		authHeaderSymmetricJwtMiddleware as RequestHandler,
		(req, res) => {
			// await database.enableJiraTenant(req.body.clientKey);
			res.sendStatus(204);
		},
	);

	lifecycleEventsRouter.post(
		'/disabled',
		authHeaderSymmetricJwtMiddleware,
		(req, res) => {
			// await database.disableJiraTenant(req.body.clientKey);
			res.sendStatus(204);
		},
	);

	lifecycleEventsRouter.post(
		'/uninstalled',
		authHeaderAsymmetricJwtMiddleware,
		(req, res) => {
			// const { clientKey } = req.body;
			// await database.removeJiraTenant(clientKey);
			res.sendStatus(204);
		},
	);

	return lifecycleEventsRouter;
}
