import type { ConnectUserInfo } from './connect-user-info';

export enum FigmaFileWebhookEventType {
	FILE_UPDATE = 'FILE_UPDATE',
	DEV_MODE_STATUS_UPDATE = 'DEV_MODE_STATUS_UPDATE',
}

export class FigmaFileWebhook {
	readonly #creatorInfo: ConnectUserInfo;
	readonly id: string;
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly fileKey: string;
	readonly eventType: FigmaFileWebhookEventType;
	readonly creatorAtlassianUserId: string;
	readonly connectInstallationId: string;

	constructor(
		params: FigmaFileWebhookCreateParams & {
			readonly id: string;
		},
	) {
		this.id = params.id;
		this.webhookId = params.webhookId;
		this.webhookPasscode = params.webhookPasscode;
		this.fileKey = params.fileKey;
		this.eventType = params.eventType;
		this.creatorAtlassianUserId = params.creatorAtlassianUserId;

		this.connectInstallationId = params.connectInstallationId;

		this.#creatorInfo = {
			atlassianUserId: this.creatorAtlassianUserId,
			connectInstallationId: this.connectInstallationId,
		};
	}

	get creatorInfo(): ConnectUserInfo {
		return this.#creatorInfo;
	}
}

export type FigmaFileWebhookCreateParams = {
	readonly webhookId: string;
	readonly webhookPasscode: string;
	readonly fileKey: string;
	readonly eventType: FigmaFileWebhookEventType;
	readonly creatorAtlassianUserId: string;
	readonly connectInstallationId: string;
};
