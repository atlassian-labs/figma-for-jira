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
				user: {
					type: 'object',
					properties: {
						id: { type: 'string' },
					},
					required: ['id'],
				},
			},
			required: ['entity', 'user'],
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
				associatedWith: {
					type: 'object',
					properties: {
						ati: { type: 'string', pattern: 'ati:cloud:jira:issue' }, // Handle only associations with a Jira Issue.
						ari: { type: 'string' },
						cloudId: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ati', 'ari', 'cloudId', 'id'],
				},
				user: {
					type: 'object',
					properties: {
						id: { type: 'string', nullable: true },
					},
				},
			},
			required: ['entity', 'associatedWith', 'user'],
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
				disassociatedFrom: {
					type: 'object',
					properties: {
						ati: { type: 'string', pattern: 'ati:cloud:jira:issue' }, // Handle only associations with a Jira Issue.
						ari: { type: 'string' },
						cloudId: { type: 'string' },
						id: { type: 'string' },
					},
					required: ['ati', 'ari', 'cloudId', 'id'],
				},
				user: {
					type: 'object',
					properties: {
						id: { type: 'string', nullable: true },
					},
				},
			},
			required: ['entity', 'disassociatedFrom', 'user'],
		},
	},
	required: ['body'],
};
