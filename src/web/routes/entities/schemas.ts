import type {
	AssociateEntityRequestBody,
	DisassociateEntityRequestBody,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';

export const ASSOCIATE_ENTITY_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: AssociateEntityRequestBody;
}> = {
	$id: 'figma-for-jira-api:post:entities/associateEntity:request',
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
			required: ['userId'],
		},
	},
	required: ['body'],
};

export const DISASSOCIATE_ENTITY_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: DisassociateEntityRequestBody;
}> = {
	$id: 'figma-for-jira-api:post:entities/disassociateEntity:request',
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
			required: ['userId'],
		},
	},
	required: ['body'],
};
