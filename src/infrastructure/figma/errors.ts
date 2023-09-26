export class FigmaServiceError extends Error {}

export class FigmaServiceCredentialsError extends FigmaServiceError {
	cause?: Error;

	constructor(atlassianUserId: string, cause?: Error) {
		super(`No valid Figma OAuth2 credentials for ${atlassianUserId}`);
		this.cause = cause;
	}
}

export class FigmaWebhookValidationError extends Error {}

export class FigmaWebhookEventTypeValidationError extends FigmaWebhookValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid event type`);
	}
}

export class FigmaWebhookAuthValidationError extends FigmaWebhookValidationError {
	constructor(webhookId: string) {
		super(`Figma team admin auth token for webhook ${webhookId} is invalid`);
	}
}

export class FigmaWebhookPasscodeValidationError extends FigmaWebhookValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid passcode`);
	}
}
