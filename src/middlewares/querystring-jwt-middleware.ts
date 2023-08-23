import { fromExpressRequest } from 'atlassian-jwt';
import { NextFunction, Request, Response } from 'express';

import { verifySymmetricJWTToken } from '../utils/jwt';

/**
 * Takes JWT token from query and verifies it using jwt-middleware
 */
export const querystringJwtMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		// The 'jwt' query parameter is injected into the iframe url
		res.locals.jiraTenant = await verifySymmetricJWTToken(
			fromExpressRequest(req),
			req.query.jwt as string,
		);
		next();
	} catch (e: any) { // TODO: Remove the `any` usage.
		res.status(e.status).send(e.message);
	}
};
