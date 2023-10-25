import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import {
	ForbiddenOperationError,
	UnauthorizedOperationError,
	ValidationError,
} from '../../common/errors';
import {
	BadRequestResultError,
	ForbiddenResultError,
	UnauthorizedResultError,
} from '../../usecases';

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

	if (err instanceof BadRequestResultError) {
		res.sendStatus(HttpStatusCode.BadRequest);
	} else if (err instanceof UnauthorizedResultError) {
		res.status(HttpStatusCode.Unauthorized).send(err.message);
	} else if (err instanceof ForbiddenResultError) {
		res.status(HttpStatusCode.Forbidden).send(err.message);
	} else if (
		// TODO: Delete handling these errors once error handling is refactored in use cases.
		err instanceof UnauthorizedOperationError ||
		err instanceof ForbiddenOperationError
	) {
		res.status(HttpStatusCode.Forbidden).send(err.message);
	} else if (err instanceof ValidationError) {
		// TODO: Delete handling this error once error handling is refactored in use cases.
		res.sendStatus(HttpStatusCode.BadRequest);
	} else {
		res.sendStatus(HttpStatusCode.InternalServerError);
	}

	next();
};
