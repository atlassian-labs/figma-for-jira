import type {
	AuthCallbackQueryParameters,
	CheckAuthQueryParameters,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure/ajv';

export const AUTH_CALLBACK_QUERY_PARAMETERS_SCHEMA: JSONSchemaTypeWithId<AuthCallbackQueryParameters> =
	{
		$id: 'figma-for-jira:auth-callback-query-parameters',
		type: 'object',
		properties: {
			code: { type: 'string' },
			state: { type: 'string' },
		},
		required: ['code', 'state'],
	};

export const CHECK_AUTH_QUERY_PARAMETERS_SCHEMA: JSONSchemaTypeWithId<CheckAuthQueryParameters> =
	{
		$id: 'figma-for-jira:check-auth-query-parameters',
		type: 'object',
		properties: {
			userId: { type: 'string' },
		},
		required: ['userId'],
	};
