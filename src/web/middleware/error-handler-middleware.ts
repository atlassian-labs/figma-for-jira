import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import {
	ForbiddenOperationError,
	UnauthorizedOperationError,
	ValidationError,
} from '../../common/errors';
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

	if (err instanceof ResponseStatusError) {
		res.status(err.statusCode).send(err.getSafeResponse());
		return next();
	}

	// TODO: Delete handling these errors once error handling is refactored in use cases.
	// By default, consider all non-`ResponseStatusError` errors as internal server error.
	if (
		err instanceof UnauthorizedOperationError ||
		err instanceof ForbiddenOperationError
	) {
		res.status(HttpStatusCode.Forbidden).send({ message: err.message });
		return next();
	}

	// TODO: Delete handling this error once error handling is refactored in use cases.
	// 	By default, consider all non-`ResponseStatusError` errors as internal server error.
	if (err instanceof ValidationError) {
		res.status(HttpStatusCode.BadRequest).send({ message: err.message });
		return next();
	}

	res
		.status(HttpStatusCode.InternalServerError)
		.send({ message: 'Internal server error' });

	next();
};
