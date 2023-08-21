import { RequestHandler, Router } from 'express';

import type { TypedRequest } from './types';

import { ConnectInstallationCreateParams } from '../domain/entities/connect-installation';
import { ConnectInstallationRepository } from '../domain/repositories/connect-installation-repository';
import {
	authHeaderAsymmetricJwtMiddleware,
	authHeaderSymmetricJwtMiddleware,
} from '../middlewares/auth-header-jwt-middleware';
import { installedUseCase } from '../usecases/installed';

type ConnectLifecycleEventRequestBody = {
	readonly key: string;
	readonly clientKey: string;
	readonly sharedSecret: string;
	readonly baseUrl: string;
	readonly displayUrl?: string;
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
				// docs https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle-http-request-payload
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
