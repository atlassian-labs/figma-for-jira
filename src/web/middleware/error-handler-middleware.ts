import { NextFunction, Request, Response } from 'express';

import { JwtVerificationError } from './jwt-utils';

import { RepositoryRecordNotFoundError } from '../../infrastructure/repositories';

export const errorHandlerMiddleware = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	// Must delegate to default Express error handler if we've already started writing the response
	if (res.headersSent) {
		return next(err);
	}

	if (err instanceof JwtVerificationError) {
		return void res.status(401).send(err.message);
	}

	if (err instanceof RepositoryRecordNotFoundError) {
		return void res.status(404).send(err.message);
	}

	req.log.error(err);
	// Pass unhandled errors to default Express error handler
	next(err);
};
