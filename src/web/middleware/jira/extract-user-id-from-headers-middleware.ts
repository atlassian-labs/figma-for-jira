import type { NextFunction, Request, Response } from 'express';

import { ensureString } from '../../../common/stringUtils';
import { UnauthorizedError } from '../errors';

export const extractUserIdFromHeadersMiddleware = (
	req: Request,
	res: Response<unknown, { atlassianUserId: string }>,
	next: NextFunction,
): void => {
	try {
		const userId = ensureString(req.headers['user-id']);
		res.locals.atlassianUserId = userId;
	} catch (e: unknown) {
		return next(new UnauthorizedError('Missing or invalid User-Id header'));
	}

	next();
};
