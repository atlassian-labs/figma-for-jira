import { fromExpressRequest } from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isString } from '../../../common/string-utils';
import { jiraIframeOrServerToServerSymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedResponseStatusError } from '../../errors';

/**
 * Authenticates requests using an iframe symmetric JWT token received in a query param.
 *
 * In case of successful authentication, `connectInstallation` and `atlassianUserId` are set in locals.
 *
 * @remarks
 * Context JWT tokens are sent in a query param when loading an iframe
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 * @see https://community.developer.atlassian.com/t/action-required-atlassian-connect-vulnerability-allows-bypass-of-app-qsh-verification-via-context-jwts/47072
 */
export const jiraIframeSymmetricJwtAuthenticationMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.query.jwt;

	if (!isString(token) || !token) {
		return next(new UnauthorizedResponseStatusError('Missing JWT token.'));
	}

	void jiraIframeOrServerToServerSymmetricJwtTokenVerifier
		.verify(token, fromExpressRequest(req))
		.then(({ connectInstallation, atlassianUserId }) => {
			if (!atlassianUserId) {
				return next(new UnauthorizedResponseStatusError('Unauthorized.'));
			}

			res.locals.connectInstallation = connectInstallation;
			res.locals.atlassianUserId = atlassianUserId;
			next();
		})
		.catch((e) =>
			next(new UnauthorizedResponseStatusError('Unauthorized.', undefined, e)),
		);
};
