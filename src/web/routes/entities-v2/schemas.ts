import type {
	GetEntityByUrlRequestBody,
	OnEntityAssociatedRequestBody,
	OnEntityDisassociatedRequestBody,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';

export const GET_ENTITY_BY_URL_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: GetEntityByUrlRequestBody;
}> = {
	$id: 'figma-for-jira-api:put:entities/getEntityByUrl:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			properties: {
				entity: {
					type: 'object',
					properties: {
						url: { type: 'string' },
					},
					required: ['url'],
				},
			},
			required: ['entity'],
		},
		query: {
			type: 'object',
			properties: {
				userId: { type: 'string' },
			},
			required: ['userId'],
		},
	},
	required: ['body'],
};

export const ON_ENTITY_ASSOCIATED_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: OnEntityAssociatedRequestBody;
}> = {
	$id: 'figma-for-jira-api:put:entities/onEntityAssociated:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			properties: {
				entity: {
					type: 'object',
					properties: {
						ari: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ari', 'id'],
				},
				associateWith: {
					type: 'object',
					properties: {
						ati: { type: 'string', pattern: 'ati:cloud:jira:issue' }, // Handle only associations with a Jira Issue.
						ari: { type: 'string' },
						cloudId: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ati', 'ari', 'cloudId', 'id'],
				},
			},
			required: ['entity', 'associateWith'],
		},
		query: {
			type: 'object',
			properties: {
				userId: { type: 'string' },
			},
		},
	},
	required: ['body'],
};

export const ON_ENTITY_DISASSOCIATED_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: OnEntityDisassociatedRequestBody;
}> = {
	$id: 'figma-for-jira-api:put:entities/onEntityDisassociated:request',
	type: 'object',
	properties: {
		body: {
			type: 'object',
			properties: {
				entity: {
					type: 'object',
					properties: {
						ari: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ari', 'id'],
				},
				disassociateFrom: {
					type: 'object',
					properties: {
						ati: { type: 'string', pattern: 'ati:cloud:jira:issue' }, // Handle only associations with a Jira Issue.
						ari: { type: 'string' },
						cloudId: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ati', 'ari', 'cloudId', 'id'],
				},
			},
			required: ['entity', 'disassociateFrom'],
		},
		query: {
			type: 'object',
			properties: {
				userId: { type: 'string' },
			},
		},
	},
	required: ['body'],
};
