import { Router } from 'express';

import { HttpStatus } from '../../../common/http-status';
import type { ConnectInstallationCreateParams } from '../../../domain/entities';
import { installedUseCase, uninstalledUseCase } from '../../../usecases';
import { authHeaderAsymmetricJwtMiddleware } from '../../middleware';
import type { TypedRequest } from '../types';

type ConnectLifecycleEventRequestBody = {
	readonly key: string;
	readonly clientKey: string;
	readonly sharedSecret: string;
	readonly baseUrl: string;
	readonly displayUrl?: string;
};

export const lifecycleEventsRouter = Router();

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
		installedUseCase
			.execute(installation)
			.then(() => res.sendStatus(204))
			.catch(next);
	},
);

lifecycleEventsRouter.post(
	'/uninstalled',
	authHeaderAsymmetricJwtMiddleware,
	(req: TypedRequest<ConnectLifecycleEventRequestBody>, res, next) => {
		const { clientKey } = req.body;
		uninstalledUseCase
			.execute(clientKey)
			.then(() => res.sendStatus(HttpStatus.NO_CONTENT))
			.catch(next);
	},
);
