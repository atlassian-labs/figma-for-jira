import type { JiraJwtClaims } from './types';

import type { JSONSchemaTypeWithId } from '../../../infrastructure';

export const CONNECT_JWT_CLAIMS_SCHEMA = {
	$id: 'jira-software-connect:jwt-token-claims',
	type: 'object',
	properties: {
		iss: { type: 'string', minLength: 1 },
		iat: { type: 'integer' },
		exp: { type: 'integer' },
		qsh: { type: 'string', minLength: 1 },
		sub: {
			type: 'string',
			minLength: 1,
			nullable: true,
		},
		aud: {
			type: 'array',
			items: { type: 'string' },
			nullable: true,
		},
	},
	required: ['iss', 'iat', 'exp', 'qsh'],
	// Add a type assertion as workaround for the type inference limitations for the field with multiple types.
	// See for more detail: https://github.com/ajv-validator/ajv/issues/2081
} as JSONSchemaTypeWithId<
	Omit<JiraJwtClaims, 'aud'>
> as JSONSchemaTypeWithId<JiraJwtClaims>;
