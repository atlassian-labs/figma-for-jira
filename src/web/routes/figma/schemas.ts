import type {
	FigmaFileWebhookEventRequest,
	FigmaOAuth2CallbackQueryParameters,
	FigmaTeamWebhookEventRequest,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';

export const FIGMA_WEBHOOK_EVENT_REQUEST_SCHEMA = {
	$id: 'figma-for-jira-api:post:figma/webhook:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			discriminator: { propertyName: 'event_type' },
			oneOf: [
				{
					properties: {
						event_type: { const: 'PING' },
						webhook_id: { type: 'string' },
						passcode: { type: 'string' },
						timestamp: { type: 'string' },
					},
					required: ['event_type', 'webhook_id', 'passcode', 'timestamp'],
				},
				{
					properties: {
						event_type: { const: 'FILE_UPDATE' },
						webhook_id: { type: 'string' },
						file_key: { type: 'string' },
						file_name: { type: 'string' },
						passcode: { type: 'string' },
						timestamp: { type: 'string' },
					},
					required: [
						'event_type',
						'webhook_id',
						'file_key',
						'file_name',
						'passcode',
						'timestamp',
					],
				},
				{
					properties: {
						event_type: { const: 'FILE_DELETE' },
						webhook_id: { type: 'string' },
						file_key: { type: 'string' },
						passcode: { type: 'string' },
					},
					required: ['event_type', 'webhook_id', 'file_key', 'passcode'],
				},
				{
					properties: {
						event_type: { const: 'DEV_MODE_STATUS_UPDATE' },
						webhook_id: { type: 'string' },
						file_key: { type: 'string' },
						status: { type: 'string' },
						passcode: { type: 'string' },
					},
					required: [
						'event_type',
						'webhook_id',
						'file_key',
						'status',
						'passcode',
					],
				},
			],
		},
	},
	required: ['body'],
} as unknown as JSONSchemaTypeWithId<{
	body: FigmaTeamWebhookEventRequest | FigmaFileWebhookEventRequest;
}>;

export const FIGMA_OAUTH2_CALLBACK_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	query: FigmaOAuth2CallbackQueryParameters;
}> = {
	$id: 'figma-for-jira-api:get:figma/oauth/callback:request',
	type: 'object',
	properties: {
		query: {
			type: 'object',
			properties: {
				code: { type: 'string' },
				state: { type: 'string' },
			},
			required: ['code', 'state'],
		},
	},
	required: ['query'],
};
