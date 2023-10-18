import { HttpStatusCode, isAxiosError } from 'axios';

import {
	ForbiddenOperationError,
	NotFoundOperationError,
	OperationError,
	UnauthorizedOperationError,
} from '../common/errors';

export const withOperationErrorTranslation = async <T>(
	fn: () => Promise<T>,
) => {
	try {
		return await fn();
	} catch (e: unknown) {
		throw translateAxiosError(e);
	}
};

const translateAxiosError = (error: unknown): unknown => {
	if (!isAxiosError(error)) return error;

	switch (error.response?.status) {
		case HttpStatusCode.NotFound:
			return new NotFoundOperationError(error.message, error);
		case HttpStatusCode.Unauthorized:
			return new UnauthorizedOperationError(error.message, error);
		case HttpStatusCode.Forbidden:
			return new ForbiddenOperationError(error.message, error);
		default:
			return new OperationError(error.message, error);
	}
};
