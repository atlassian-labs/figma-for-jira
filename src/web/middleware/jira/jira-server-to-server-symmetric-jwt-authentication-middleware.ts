import { fromExpressRequest } from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { jiraIframeOrServerToServerSymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedResponseStatusError } from '../../errors';

/**
 * Authenticates requests using an iframe or server-to-server symmetric JWT token.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * An iframe or server-to-server symmetric JWT tokens are sent by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
export const jiraServerToServerSymmetricJwtAuthenticationMiddleware: RequestHandler =
	(req: Request, res: Response, next: NextFunction) => {
		const token = req.headers.authorization?.replace('JWT ', '');

		if (!token) {
			return next(new UnauthorizedResponseStatusError('Missing JWT token.'));
		}

		void jiraIframeOrServerToServerSymmetricJwtTokenVerifier
			.verify(token, fromExpressRequest(req))
			.then(({ connectInstallation }) => {
				res.locals.connectInstallation = connectInstallation;
				next();
			})
			.catch((e) =>
				next(
					new UnauthorizedResponseStatusError('Unauthorized.', undefined, e),
				),
			);
	};
