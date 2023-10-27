import { CauseAwareError } from '../common/errors';

/**
 * A business error from a use case execution.
 * Consider mapping these errors to the final application result (e.g., an HTTP status).
 */
export class UseCaseError extends CauseAwareError {}

export class ForbiddenByFigmaUseCaseError extends UseCaseError {
	constructor(cause: unknown) {
		super('Not authorized to access Figma API.', cause);
	}
}

export class InvalidInputUseCaseError extends UseCaseError {
	constructor(
		readonly detail: string,
		cause?: unknown,
	) {
		super('Invalid input', cause);
	}
}
