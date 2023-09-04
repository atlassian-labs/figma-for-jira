/**
 * Contains JSON schema definitions for Jira API responses. Used for validating the types of incoming data on the entry
 * points to the application.
 */
import type { JSONSchemaType } from 'ajv';

import type {
	Association,
	DesignKey,
	GetIssueResponse,
	SubmitDesignsResponse,
} from './types';

export const GET_ISSUE_RESPONSE_SCHEMA: JSONSchemaType<GetIssueResponse> = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		key: { type: 'string' },
		fields: {
			type: 'object',
			properties: {
				summary: { type: 'string' },
			},
			required: ['summary'],
		},
	},
	required: ['id', 'key'],
} as const;

const DESIGN_KEY_SCHEMA: JSONSchemaType<DesignKey> = {
	type: 'object',
	properties: {
		designId: { type: 'string' },
	},
	required: ['designId'],
};

const ASSOCIATION_SCHEMA: JSONSchemaType<Association> = {
	type: 'object',
	properties: {
		associationType: { type: 'string' },
		values: {
			type: 'array',
			items: { type: 'string' },
		},
	},
	required: ['associationType', 'values'],
};

export const SUBMIT_DESIGNS_RESPONSE_SCHEMA: JSONSchemaType<SubmitDesignsResponse> =
	{
		type: 'object',
		properties: {
			acceptedEntities: {
				type: 'array',
				items: DESIGN_KEY_SCHEMA,
			},
			rejectedEntities: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						key: DESIGN_KEY_SCHEMA,
						errors: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									message: { type: 'string' },
								},
								required: ['message'],
							},
						},
					},
					required: ['key', 'errors'],
				},
			},
			unknownIssueKeys: {
				type: 'array',
				items: { type: 'string' },
				nullable: true,
			},
			unknownAssociations: {
				type: 'array',
				items: ASSOCIATION_SCHEMA,
				nullable: true,
			},
		},
		required: ['acceptedEntities', 'rejectedEntities'],
	} as const;
