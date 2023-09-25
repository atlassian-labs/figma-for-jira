import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import { CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA } from './schemas';
import type {
	ConnectLifecycleEventRequest,
	ConnectLifecycleEventResponse,
} from './types';

import type { ConnectInstallationCreateParams } from '../../../domain/entities';
import { assertSchema } from '../../../infrastructure';
import { installedUseCase, uninstalledUseCase } from '../../../usecases';
import { authHeaderAsymmetricJwtMiddleware } from '../../middleware';

export const lifecycleEventsRouter = Router();

/**
 * Handles an "Installed" lifecycle event.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle
 */
lifecycleEventsRouter.post(
	'/installed',
	authHeaderAsymmetricJwtMiddleware,
	(
		req: ConnectLifecycleEventRequest,
		res: ConnectLifecycleEventResponse,
		next: NextFunction,
	) => {
		assertSchema(req.body, CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA);
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
			.then(() => res.sendStatus(HttpStatusCode.NoContent))
			.catch(next);
	},
);

/**
 * Handles an "Uninstalled" lifecycle event.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle
 *
 * @remarks
 * Currently, Jira does not retry the "Uninstall" event in case of a failure.
 * Therefore, there is a risk of getting stale data in the database or not disposed resources (e.g.,
 * Figma webhook)  in case of a failure.
 * Consider using a queue (e.g., SQS) to make a use case execution retryable.
 */
lifecycleEventsRouter.post(
	'/uninstalled',
	authHeaderAsymmetricJwtMiddleware,
	(
		req: ConnectLifecycleEventRequest,
		res: ConnectLifecycleEventResponse,
		next: NextFunction,
	) => {
		assertSchema(req.body, CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA);
		const { clientKey } = req.body;
		uninstalledUseCase
			.execute(clientKey)
			.then(() => res.sendStatus(HttpStatusCode.NoContent))
			.catch(next);
	},
);
