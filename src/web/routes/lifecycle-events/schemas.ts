import type {
	InstalledConnectLifecycleEventRequestBody,
	UninstalledConnectLifecycleEventRequestBody,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure';

export const INSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA: JSONSchemaTypeWithId<InstalledConnectLifecycleEventRequestBody> =
	{
		$id: 'jira-software-connect:installed-lifecycle-event-request-body',
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

export const UNINSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_BODY_SCHEMA: JSONSchemaTypeWithId<UninstalledConnectLifecycleEventRequestBody> =
	{
		$id: 'jira-software-connect:uninstalled-lifecycle-event-request-body',
		type: 'object',
		properties: {
			key: { type: 'string' },
			clientKey: { type: 'string' },
			baseUrl: { type: 'string' },
			displayUrl: { type: 'string', nullable: true },
		},
		required: ['key', 'clientKey', 'baseUrl'],
	};
