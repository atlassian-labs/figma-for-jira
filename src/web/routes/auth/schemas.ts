import type { CheckAuthQueryParameters } from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';

export const CHECK_AUTH_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	query: CheckAuthQueryParameters;
}> = {
	$id: 'figma-for-jira:check-auth-query-parameters',
	type: 'object',
	properties: {
		query: {
			type: 'object',
			properties: {
				userId: { type: 'string' },
			},
			required: ['userId'],
		},
	},
	required: ['query'],
};
