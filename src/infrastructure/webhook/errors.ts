export class WebhookServiceValidationError extends Error {}

export class WebhookServiceEventTypeValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid event type`);
	}
}

export class WebhookServiceAuthValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Figma team admin auth token for webhook ${webhookId} is invalid`);
	}
}

export class WebhookServicePasscodeValidationError extends WebhookServiceValidationError {
	constructor(webhookId: string) {
		super(`Received webhook event for ${webhookId} with invalid passcode`);
	}
}
