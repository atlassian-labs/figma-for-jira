import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from './errors';

import {
	ForbiddenOperationError,
	NotFoundOperationError,
	UnauthorizedOperationError,
	ValidationError,
} from '../../common/errors';

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

	if (err instanceof UnauthorizedError) {
		res.status(HttpStatusCode.Unauthorized).send(err.message);
	} else if (err instanceof NotFoundOperationError) {
		res.status(HttpStatusCode.NotFound).send(err.message);
	} else if (
		err instanceof UnauthorizedOperationError ||
		err instanceof ForbiddenOperationError
	) {
		res.status(HttpStatusCode.Forbidden).send(err.message);
	} else if (err instanceof ValidationError) {
		res.sendStatus(HttpStatusCode.BadRequest);
	} else {
		res.sendStatus(HttpStatusCode.InternalServerError);
	}

	next();
};
