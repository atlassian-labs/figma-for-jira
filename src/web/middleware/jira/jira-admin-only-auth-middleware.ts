import type { NextFunction, Request, Response } from 'express';

import type { ConnectInstallation } from '../../../domain/entities';
import { jiraService } from '../../../infrastructure/jira';
import { UnauthorizedResultError } from '../../../usecases';

export const jiraAdminOnlyAuthMiddleware = (
	req: Request,
	res: Response<
		unknown,
		{ atlassianUserId: string; connectInstallation: ConnectInstallation }
	>,
	next: NextFunction,
): void => {
	const { atlassianUserId, connectInstallation } = res.locals;

	jiraService
		.isAdmin(atlassianUserId, connectInstallation)
		.then((isAdmin) => {
			if (!isAdmin) {
				return next(
					new UnauthorizedResultError(
						'Unauthorized. The resource is available only for admins.',
					),
				);
			}

			next();
		})
		.catch(next);
};
