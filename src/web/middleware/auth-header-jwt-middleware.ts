import { fromExpressRequest } from 'atlassian-jwt';
import { NextFunction, Request, Response } from 'express';

import { verifyAsymmetricJWTToken, verifySymmetricJWTToken } from './jwt-utils';

const validateAuthToken =
	(type: 'symmetric' | 'asymmetric') =>
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			// The jwt token is taken from the Authorization headers
			const token = req.headers.authorization?.replace('JWT ', '');
			const request = fromExpressRequest(req);
			switch (type) {
				case 'symmetric':
					res.locals.jiraTenant = await verifySymmetricJWTToken(request, token);
					break;
				case 'asymmetric':
					await verifyAsymmetricJWTToken(request, token);
			}
			next();
		} catch (e: unknown) {
			// TODO: properly handle error from verifySymmetricJWTToken when we re-add the code
			// res.status(e.status).send(e.message);
			res.status(500).send();
		}
	};
/**
 * Takes JWT token from Authorization header and verifies it using jwt-middleware
 * Either specifies it as a symmetric (validated using shared secret given in installed lifecycle)
 * or asymmetric token (validated using connect public key based on key id)
 */
export const authHeaderSymmetricJwtMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => void validateAuthToken('symmetric')(req, res, next);
export const authHeaderAsymmetricJwtMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => void validateAuthToken('asymmetric')(req, res, next);
