export class CauseAwareError extends Error {
	constructor(
		message?: string,
		readonly cause?: unknown,
	) {
		super(message);
	}
}

export class OperationError extends CauseAwareError {}

export class NotFoundOperationError extends OperationError {}

export class UnauthorizedOperationError extends OperationError {}

export class ForbiddenOperationError extends OperationError {}

export class ValidationError extends CauseAwareError {}
