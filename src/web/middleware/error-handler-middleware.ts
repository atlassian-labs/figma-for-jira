import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import { JwtVerificationError } from './jwt-utils';

import { FigmaServiceCredentialsError } from '../../infrastructure/figma';
import { RepositoryRecordNotFoundError } from '../../infrastructure/repositories';
import { UnauthorizedError } from '../routes/entities';

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

	// Setting `err` on the response so it can be picked up by the `pino-http` logger
	res.err = err;

	if (err instanceof JwtVerificationError || err instanceof UnauthorizedError) {
		res.status(HttpStatusCode.Unauthorized).send(err.message);
	} else if (err instanceof RepositoryRecordNotFoundError) {
		res.status(HttpStatusCode.NotFound).send(err.message);
	} else if (err instanceof FigmaServiceCredentialsError) {
		res.status(HttpStatusCode.Forbidden).send(err.message);
	} else {
		res.sendStatus(HttpStatusCode.InternalServerError);
	}

	next();
};
