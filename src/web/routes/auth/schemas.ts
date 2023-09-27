import type { CheckAuthQueryParameters } from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure';

export const CHECK_AUTH_QUERY_PARAMETERS_SCHEMA: JSONSchemaTypeWithId<CheckAuthQueryParameters> =
	{
		$id: 'figma-for-jira:check-auth-query-parameters',
		type: 'object',
		properties: {
			userId: { type: 'string' },
		},
		required: ['userId'],
	};
