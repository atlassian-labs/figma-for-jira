export enum FigmaFileWebhookEventType {
	FILE_UPDATE = 'FILE_UPDATE',
	DEV_MODE_STATUS_UPDATE = 'DEV_MODE_STATUS_UPDATE',
}

export type FigmaFileWebhook = {
	readonly id: string;
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly fileKey: string;
	readonly eventType: FigmaFileWebhookEventType;
	readonly createdBy: {
		readonly atlassianUserId: string;
		readonly connectInstallationId: string;
	};
};

export type FigmaFileWebhookCreateParams = {
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly fileKey: string;
	readonly eventType: FigmaFileWebhookEventType;
	readonly createdBy: {
		readonly atlassianUserId: string;
		readonly connectInstallationId: string;
	};
};
