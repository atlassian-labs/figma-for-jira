import type {
	AssociateEntityRequestBody,
	DisassociateEntityRequestBody,
} from './types';

import type { JSONSchemaTypeWithId } from '../../../common/schema-validation';
import { ATLASSIAN_ENTITY_SCHEMA } from '../../../usecases/schemas';

export const ASSOCIATE_ENTITY_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: AssociateEntityRequestBody;
}> = {
	$id: 'figma-for-jira:associate-entity-request-body',
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
				associateWith: ATLASSIAN_ENTITY_SCHEMA,
			},
			required: ['entity', 'associateWith'],
		},
	},
	required: ['body'],
};

export const DISASSOCIATE_ENTITY_REQUEST_SCHEMA: JSONSchemaTypeWithId<{
	body: DisassociateEntityRequestBody;
}> = {
	$id: 'figma-for-jira:disassociate-entity-request-body',
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
				disassociateFrom: ATLASSIAN_ENTITY_SCHEMA,
			},
			required: ['entity', 'disassociateFrom'],
		},
	},
	required: ['body'],
};
