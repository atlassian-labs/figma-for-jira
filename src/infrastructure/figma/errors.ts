export class FigmaServiceError extends Error {}

export class FigmaServiceCredentialsError extends FigmaServiceError {
	cause?: Error;

	constructor(atlassianUserId: string, cause?: Error) {
		super(`No valid Figma OAuth2 credentials for ${atlassianUserId}`);
		this.cause = cause;
	}
}
