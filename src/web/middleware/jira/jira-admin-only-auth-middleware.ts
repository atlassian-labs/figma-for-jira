import type { NextFunction, Request, Response } from 'express';

import type { ConnectInstallation } from '../../../domain/entities';
import {
	ForbiddenByJiraServiceError,
	jiraService,
} from '../../../infrastructure/jira';
import { UnauthorizedResponseStatusError } from '../../errors';

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
					new UnauthorizedResponseStatusError(
						'Unauthorized. The resource is available only for admins.',
					),
				);
			}

			next();
		})
		.catch((err) => {
			if (err instanceof ForbiddenByJiraServiceError) {
				return next(
					new UnauthorizedResponseStatusError(
						'Unauthorized. The resource is available only for admins.',
					),
				);
			}
			next(err);
		});
};
