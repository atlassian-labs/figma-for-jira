import { CauseAwareError } from '../common/errors';

export type ResponseDetails = {
	reason: string;
};
export class HttpClientError extends CauseAwareError {
	constructor(
		message: string,
		cause?: Error,
		readonly response?: unknown,
	) {
		super(message, cause);
	}
}

export class BadRequestHttpClientError extends HttpClientError {}

export class NotFoundHttpClientError extends HttpClientError {}

export class UnauthorizedHttpClientError extends HttpClientError {}

export class ForbiddenHttpClientError extends HttpClientError {}
