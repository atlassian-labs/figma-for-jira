import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { jiraInboundAuthService } from '../../../infrastructure/jira/jira-inbound-auth-service';
import { UnauthorizedError } from '../errors';

/**
 * Authenticates requests using a context symmetric JWT token.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * Context JWT tokens are sent by Connect App UI embed in Jira via extension points.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
export const jiraContextSymmetricJwtAuthMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT ', '');

	if (!token) {
		return next(new UnauthorizedError('Missing JWT token.'));
	}

	void jiraInboundAuthService
		.verifyContextSymmetricJwtToken(token)
		.then(({ connectInstallation, atlassianUserId }) => {
			res.locals.connectInstallation = connectInstallation;
			res.locals.atlassianUserId = atlassianUserId;
			next();
		})
		.catch(next);
};
