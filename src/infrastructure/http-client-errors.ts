import { CauseAwareError } from '../common/errors';

export class HttpClientError extends CauseAwareError {
	constructor(
		message?: string,
		readonly response?: unknown,
		cause?: Error,
	) {
		super(message, cause);
	}
}

export class BadRequestHttpClientError extends HttpClientError {}

export class NotFoundHttpClientError extends HttpClientError {}

export class UnauthorizedHttpClientError extends HttpClientError {}

export class ForbiddenHttpClientError extends HttpClientError {}
