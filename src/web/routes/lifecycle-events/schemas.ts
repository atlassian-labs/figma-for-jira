import type {
	InstalledConnectLifecycleEventRequestBody,
	UninstalledConnectLifecycleEventRequestBody,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';

export const INSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: InstalledConnectLifecycleEventRequestBody;
}> = {
	$id: 'figma-for-jira-api:post:lifecycleEvents/installed:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			properties: {
				key: { type: 'string' },
				clientKey: { type: 'string' },
				sharedSecret: { type: 'string' },
				baseUrl: { type: 'string' },
				displayUrl: { type: 'string', nullable: true },
			},
			required: ['key', 'clientKey', 'sharedSecret', 'baseUrl'],
		},
	},
	required: ['body'],
};

export const UNINSTALLED_CONNECT_LIFECYCLE_EVENT_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: UninstalledConnectLifecycleEventRequestBody;
}> = {
	$id: 'figma-for-jira-api:post:lifecycleEvents/uninstalled:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			properties: {
				key: { type: 'string' },
				clientKey: { type: 'string' },
				baseUrl: { type: 'string' },
				displayUrl: { type: 'string', nullable: true },
			},
			required: ['key', 'clientKey', 'baseUrl'],
		},
	},
	required: ['body'],
};
