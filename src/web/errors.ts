import { HttpStatusCode } from 'axios';

import { CauseAwareError } from '../common/errors';

/**
 * A base exception associated with specific HTTP response status codes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
export abstract class ResponseStatusError extends CauseAwareError {
	/**
	 * @param statusCode An HTTP status code.
	 * @param message A user-facing error message. Should NOT hold sensitive or internal information.
	 * @param details A user-facing error details. Should NOT hold sensitive or internal information.
	 * @param cause A cause for the error. Can hold internal information for logging but should not be returned to a user.
	 */
	protected constructor(
		readonly statusCode: HttpStatusCode,
		message: string,
		readonly details?: unknown,
		cause?: unknown,
	) {
		super(message, cause);
	}

	getSafeResponse(): Pick<ResponseStatusError, 'message' | 'details'> {
		return { message: this.message, details: this.details };
	}
}

export class BadRequestResponseStatusError extends ResponseStatusError {
	constructor(
		message?: string,
		readonly details?: unknown,
		cause?: unknown,
	) {
		super(HttpStatusCode.BadRequest, message ?? 'Bad request', details, cause);
	}
}

export class UnauthorizedResponseStatusError extends ResponseStatusError {
	constructor(
		message?: string,
		readonly details?: unknown,
		cause?: unknown,
	) {
		super(
			HttpStatusCode.Unauthorized,
			message ?? 'Unauthorized',
			details,
			cause,
		);
	}
}
