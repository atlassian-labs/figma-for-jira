import type { ErrorObject } from 'ajv';

export class ValidationError extends Error {
	errors?: ErrorObject[] | null;

	constructor(message: string, errors?: ErrorObject[] | null) {
		super(message);
		this.errors = errors;
	}
}
