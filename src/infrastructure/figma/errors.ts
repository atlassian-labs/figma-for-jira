export class FigmaServiceError extends Error {}

export class FigmaServiceCredentialsError extends FigmaServiceError {
	cause?: Error;

	constructor(atlassianUserId: string, cause?: Error) {
		super(`No valid Figma OAuth2 credentials for ${atlassianUserId}`);
		this.cause = cause;
	}
}

export class WebhookServiceValidationError extends Error {}

export class FigmaWebhookServiceEventTypeValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid event type`);
	}
}

export class FigmaWebhookServiceAuthValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Figma team admin auth token for webhook ${webhookId} is invalid`);
	}
}

export class FigmaWebhookServicePasscodeValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid passcode`);
	}
}
