import { CauseAwareError } from '../common/errors';

/**
 * A business error from a use case execution.
 * Consider mapping the error directly to the final application result (e.g., an HTTP status).
 */
export class UseCaseResultError extends CauseAwareError {}

export class ForbiddenByFigmaUseCaseResultError extends UseCaseResultError {
	constructor(cause: unknown) {
		super('Not authorized to access Figma API.', cause);
	}
}

export class InvalidInputUseCaseResultError extends UseCaseResultError {
	constructor(
		readonly detail: string,
		cause?: unknown,
	) {
		super('Invalid input', cause);
	}
}
