import type { ErrorObject } from 'ajv';

export class JiraClientError extends Error {}

export class JiraClientResponseValidationError extends JiraClientError {
	errors?: null | ErrorObject[];

	constructor(url: URL, errors?: null | ErrorObject[]) {
		super(`Unexpected response from ${url.toString()}`);
		this.errors = errors;
	}
}
