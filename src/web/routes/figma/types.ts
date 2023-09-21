// See https://www.figma.com/developers/api#webhooks-v2-events
export type FigmaWebhookEventType =
	| 'PING'
	| 'FILE_UPDATE'
	| 'FILE_VERSION_UPDATE'
	| 'FILE_DELETE'
	| 'LIBRARY_PUBLISH'
	| 'FILE_COMMENT';

export type FigmaWebhookEventPayload = {
	readonly event_type: FigmaWebhookEventType;
	readonly file_key: string;
	readonly file_name: string;
	readonly passcode: string;
	readonly protocol_version: string;
	readonly retries: number;
	readonly timestamp: string;
	readonly webhook_id: string;
	readonly triggered_by?: {
		readonly id: string;
		readonly handle: string;
	};
};
