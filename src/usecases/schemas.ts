import type { JSONSchemaType } from 'ajv';

import type { AtlassianEntity } from './types';

export const ATLASSIAN_ENTITY_SCHEMA: JSONSchemaType<AtlassianEntity> = {
	type: 'object',
	properties: {
		ati: { type: 'string' },
		ari: { type: 'string' },
		cloudId: { type: 'string' },
		id: { type: 'string' },
	},
	required: ['ati', 'ari', 'cloudId', 'id'],
};
