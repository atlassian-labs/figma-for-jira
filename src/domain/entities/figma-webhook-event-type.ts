// See https://www.figma.com/developers/api#webhooks-v2-events
export type FigmaWebhookEventType =
	| 'PING'
	| 'FILE_UPDATE'
	| 'FILE_VERSION_UPDATE'
	| 'FILE_DELETE'
	| 'LIBRARY_PUBLISH'
	| 'FILE_COMMENT';
