import { CauseAwareError } from '../common/errors';

/**
 * A business error from a use case execution.
 * Consider mapping the error directly to the final application result (e.g., an HTTP status).
 */
export class UseCaseResultError extends CauseAwareError {}

export class ForbiddenByFigmaUseCaseResultError extends UseCaseResultError {
	constructor(cause: Error) {
		super('Not authorized to access Figma API.', cause);
	}
}

export class PaidFigmaPlanRequiredUseCaseResultError extends UseCaseResultError {
	constructor(cause: Error) {
		super('You need a paid Figma plan to perform this operation.', cause);
	}
}

export class InvalidInputUseCaseResultError extends UseCaseResultError {
	constructor(
		readonly detail: string,
		cause?: Error,
	) {
		super('Invalid input', cause);
	}
}
