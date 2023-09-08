import type { ErrorObject } from 'ajv';
export class JiraClientError extends Error {}

export class JiraClientResponseValidationError extends JiraClientError {
	errors?: null | ErrorObject[];

	constructor(url: URL, errors?: null | ErrorObject[]) {
		super(`Unexpected response from ${url.pathname}`);
		this.errors = errors;
	}
}

export class JiraClientNotFoundError extends JiraClientError {}
