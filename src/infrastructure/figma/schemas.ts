import type { JSONSchemaType } from 'ajv';

import type { JSONSchemaTypeWithId } from '../ajv';

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

// See https://www.figma.com/developers/api#webhooks-v2-events
export type FigmaWebhookEventType =
	| 'PING'
	| 'FILE_UPDATE'
	| 'FILE_VERSION_UPDATE'
	| 'FILE_DELETE'
	| 'LIBRARY_PUBLISH'
	| 'FILE_COMMENT';

const FIGMA_WEBHOOK_EVENT_TYPE_SCHEMA: JSONSchemaType<FigmaWebhookEventType> = {
	type: 'string',
	enum: [
		'PING',
		'FILE_UPDATE',
		'FILE_VERSION_UPDATE',
		'FILE_DELETE',
		'LIBRARY_PUBLISH',
		'FILE_COMMENT',
	],
};

export const FIGMA_WEBHOOK_PAYLOAD_SCHEMA: JSONSchemaTypeWithId<FigmaWebhookEventPayload> =
	{
		$id: 'figma-rest-api:webhook:event-payload',
		type: 'object',
		properties: {
			event_type: FIGMA_WEBHOOK_EVENT_TYPE_SCHEMA,
			file_key: { type: 'string' },
			file_name: { type: 'string' },
			passcode: { type: 'string' },
			protocol_version: { type: 'string' },
			retries: { type: 'integer' },
			timestamp: { type: 'string' },
			webhook_id: { type: 'string' },
			triggered_by: {
				type: 'object',
				nullable: true,
				properties: {
					id: { type: 'string' },
					handle: { type: 'string' },
				},
				required: ['id', 'handle'],
			},
		},
		required: [
			'event_type',
			'file_key',
			'file_name',
			'passcode',
			'protocol_version',
			'retries',
			'timestamp',
			'webhook_id',
		],
	};
