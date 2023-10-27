import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import {
	ForbiddenByFigmaUseCaseError,
	InvalidInputUseCaseError,
	UseCaseError,
} from '../../usecases';
import { ResponseStatusError } from '../errors';

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

	// Setting `err` on the response, so it can be picked up by the `pino-http` logger
	res.err = err;

	// Handle errors from the web layer (e.g., from middlewares).
	if (err instanceof ResponseStatusError) {
		res.status(err.statusCode).send(err.getSafeResponse());
		return next();
	}

	if (err instanceof UseCaseError) {
		switch (err.constructor) {
			case InvalidInputUseCaseError: {
				res.status(HttpStatusCode.BadRequest).send({ message: err.message });
				return next();
			}

			case ForbiddenByFigmaUseCaseError: {
				res.status(HttpStatusCode.Forbidden).send({ message: err.message });
				return next();
			}
		}
	}

	res
		.status(HttpStatusCode.InternalServerError)
		.send({ message: 'Internal server error' });

	next();
};
