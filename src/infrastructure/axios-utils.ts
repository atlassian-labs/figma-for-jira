import { HttpStatusCode, isAxiosError } from 'axios';

import {
	BadRequestHttpClientError,
	ForbiddenHttpClientError,
	HttpClientError,
	NotFoundHttpClientError,
	UnauthorizedHttpClientError,
} from './http-client-errors';

export const withAxiosErrorTranslation = async <T>(fn: () => Promise<T>) => {
	try {
		return await fn();
	} catch (e: unknown) {
		throw translateAxiosError(e);
	}
};

const translateAxiosError = (error: unknown): unknown => {
	if (!isAxiosError(error)) return error;

	switch (error.response?.status) {
		case HttpStatusCode.BadRequest:
			return new BadRequestHttpClientError(
				error.message,
				error.response.data,
				error,
			);
		case HttpStatusCode.Unauthorized:
			return new UnauthorizedHttpClientError(
				error.message,
				error.response.data,
				error,
			);
		case HttpStatusCode.Forbidden:
			return new ForbiddenHttpClientError(
				error.message,
				error.response.data,
				error,
			);
		case HttpStatusCode.NotFound:
			return new NotFoundHttpClientError(
				error.message,
				error.response.data,
				error,
			);
		default:
			return new HttpClientError(error.message, error.response?.data, error);
	}
};
