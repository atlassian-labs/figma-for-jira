import { fromExpressRequest } from 'atlassian-jwt';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { jiraAsymmetricJwtTokenVerifier } from '../../../infrastructure/jira/inbound-auth';
import { UnauthorizedResponseStatusError } from '../../errors';

/**
 * Authenticates requests using an asymmetric JWT token.
 *
 * @remarks
 * Asymmetric JWT tokens are sent with lifecycle callback events by Jira server.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/understanding-jwt-for-connect-apps/#types-of-jwt-token
 */
export const jiraAsymmetricJwtAuthenticationMiddleware: RequestHandler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('JWT ', '');

	if (!token) {
		return next(new UnauthorizedResponseStatusError('Missing JWT token.'));
	}

	void jiraAsymmetricJwtTokenVerifier
		.verify(token, fromExpressRequest(req))
		.then(() => next())
		.catch((e) =>
			next(new UnauthorizedResponseStatusError('Unauthorized.', undefined, e)),
		);
};
