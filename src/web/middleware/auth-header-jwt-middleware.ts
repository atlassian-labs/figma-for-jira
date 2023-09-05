import { fromExpressRequest } from 'atlassian-jwt';
import type { NextFunction, Request, Response } from 'express';

import {
	InstallationNotFoundError,
	JwtVerificationError,
	verifyAsymmetricJWTToken,
	verifySymmetricJWTToken,
} from './jwt-utils';

const validateAuthToken =
	(type: 'symmetric' | 'asymmetric') =>
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			// The jwt token is taken from the Authorization headers
			const token = req.headers.authorization?.replace('JWT ', '');
			const request = fromExpressRequest(req);
			switch (type) {
				case 'symmetric':
					res.locals.connectInstallation = await verifySymmetricJWTToken(
						request,
						token,
					);
					break;
				case 'asymmetric':
					await verifyAsymmetricJWTToken(request, token);
			}
			next();
		} catch (e: unknown) {
			if (e instanceof JwtVerificationError) {
				res.status(401).send(e.message);
				return;
			}
			if (e instanceof InstallationNotFoundError) {
				res.status(404).send(e.message);
				return;
			}
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
