export class CauseAwareError extends Error {
	constructor(
		message?: string,
		readonly cause?: unknown,
	) {
		super(message);
	}
}
