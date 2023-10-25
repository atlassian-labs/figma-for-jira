import { HttpStatusCode } from 'axios';
import type { NextFunction } from 'express';
import { Router } from 'express';

import {
	INSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA,
	UNINSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA,
} from './schemas';
import type {
	ConnectLifecycleEventResponse,
	InstalledConnectLifecycleEventRequest,
	UninstalledConnectLifecycleEventRequest,
} from './types';

import type { ConnectInstallationCreateParams } from '../../../domain/entities';
import { installedUseCase, uninstalledUseCase } from '../../../usecases';
import { requestSchemaValidationMiddleware } from '../../middleware';
import { jiraAsymmetricJwtAuthMiddleware } from '../../middleware/jira';

export const lifecycleEventsRouter = Router();

lifecycleEventsRouter.use(jiraAsymmetricJwtAuthMiddleware);

/**
 * Handles an "Installed" lifecycle event.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/connect-app-descriptor/#lifecycle
 */
lifecycleEventsRouter.post(
	'/installed',
	requestSchemaValidationMiddleware(
		INSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA,
	),
	(
		req: InstalledConnectLifecycleEventRequest,
		res: ConnectLifecycleEventResponse,
		next: NextFunction,
	) => {
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
 * **Issue 1: An "Uninstall" event is not retryable**
 *
 * Currently, Jira does not retry an "Uninstall" event in case of a failure.
 * Therefore, there is a risk of getting stale data in the database or not disposed resources (e.g.,
 * Figma webhook) in case of a failure. Consider:
 * - Design the `/uninstalled` event handler to be idempotent.
 * - Consider using a queue (e.g., SQS) to retry handling an event in case of failure.
 *
 *
 * **Issue 2: An "Uninstall" event is not dispatched on uninstallation caused by a site import.**
 *
 * When a site import occurs, Connect Apps are uninstalled in the target site but "Uninstall" events are not dispatched:
 * https://community.developer.atlassian.com/t/ensuring-your-atlassian-connect-app-handles-customer-site-imports/41874
 * Consider one of the following:
 * - Find and delete stale `ConnectInstallation` records (with related resources) on an "/installed" event.
 * - Periodically validate `ConnectInstallation`s and delete stale records (with related resources).
 */
lifecycleEventsRouter.post(
	'/uninstalled',
	requestSchemaValidationMiddleware(
		UNINSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA,
	),
	(
		req: UninstalledConnectLifecycleEventRequest,
		res: ConnectLifecycleEventResponse,
		next: NextFunction,
	) => {
		const { clientKey } = req.body;
		uninstalledUseCase
			.execute(clientKey)
			.then(() => res.sendStatus(HttpStatusCode.NoContent))
			.catch(next);
	},
);
