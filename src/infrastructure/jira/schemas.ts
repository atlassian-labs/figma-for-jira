import type {
	AttachedDesignUrlV2IssuePropertyValue,
	IngestedDesignUrlIssuePropertyValue,
} from './jira-service';

import type { JSONSchemaTypeWithId } from '../ajv';

export const ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA: JSONSchemaTypeWithId<
	AttachedDesignUrlV2IssuePropertyValue[]
> = {
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

export const INGESTED_DESIGN_URL_VALUE_SCHEMA: JSONSchemaTypeWithId<
	IngestedDesignUrlIssuePropertyValue[]
> = {
	$id: 'jira-software-cloud-api:ingested-design-url:value',
	type: 'array',
	items: { type: 'string' },
};
