import { HttpStatusCode } from 'axios';
import type { NextFunction, Request, Response } from 'express';

import {
	FigmaDesignNotFoundUseCaseResultError,
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
	JiraIssueNotFoundUseCaseResultError,
	PaidFigmaPlanRequiredUseCaseResultError,
	UseCaseResultError,
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

	// Handle business error from use cases.
	if (err instanceof UseCaseResultError) {
		if (err instanceof InvalidInputUseCaseResultError) {
			res
				.status(HttpStatusCode.BadRequest)
				.send({ message: err.message, detail: err.detail });
			return next();
		}

		if (err instanceof PaidFigmaPlanRequiredUseCaseResultError) {
			res.status(HttpStatusCode.PaymentRequired).send({ message: err.message });
			return next();
		}

		if (err instanceof ForbiddenByFigmaUseCaseResultError) {
			res.status(HttpStatusCode.Forbidden).send({ message: err.message });
			return next();
		}

		if (
			err instanceof FigmaDesignNotFoundUseCaseResultError ||
			err instanceof JiraIssueNotFoundUseCaseResultError
		) {
			res.status(HttpStatusCode.NotFound).send({ message: err.message });
			return next();
		}
	}

	// Consider other errors as internal server error.
	// Do not include additional information about the error to avoid exposing internal details.
	res
		.status(HttpStatusCode.InternalServerError)
		.send({ message: 'Internal server error' });

	next();
};
