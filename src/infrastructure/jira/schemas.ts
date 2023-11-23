import type { AttachedDesignUrlV2IssuePropertyValue } from './jira-service';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';

export const ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA: JSONSchemaTypeWithId<AttachedDesignUrlV2IssuePropertyValue> =
	{
		$id: 'jira-software-cloud-api:attached-design-url-v2:value',
		type: 'array',
		items: {
			type: 'object',
			properties: {
				url: { type: 'string' },
				name: { type: 'string' },
			},
			required: ['url', 'name'],
		},
	};
