import type { ConnectLifecycleEventRequestBody } from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure/ajv';

export const CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA: JSONSchemaTypeWithId<ConnectLifecycleEventRequestBody> =
	{
		$id: 'jira-software-connect:lifecycle-event-request-body',
		type: 'object',
		properties: {
			key: { type: 'string' },
			clientKey: { type: 'string' },
			sharedSecret: { type: 'string' },
			baseUrl: { type: 'string' },
			displayUrl: { type: 'string', nullable: true },
		},
		required: ['key', 'clientKey', 'sharedSecret', 'baseUrl'],
	};
