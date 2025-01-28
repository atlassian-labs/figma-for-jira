/**
 * Contains JSON schema definitions for Jira API responses. Used for validating the types of incoming data on the entry
 * points to the application.
 */
import type {
	Association,
	CheckPermissionsResponse,
	DesignKey,
	GetIssueResponse,
	SubmitDesignsResponse,
} from './types';

import type {
	JSONSchemaType,
	JSONSchemaTypeWithId,
} from '../../../common/schema-validation';

const DESIGN_KEY_SCHEMA: JSONSchemaType<DesignKey> = {
	type: 'object',
	properties: {
		entityType: { type: 'string' },
		entityId: { type: 'string' },
	},
	required: ['entityId'],
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

export const SUBMIT_DESIGNS_RESPONSE_SCHEMA: JSONSchemaTypeWithId<SubmitDesignsResponse> =
	{
		$id: 'jira-software-cloud-api:post:/rest/designs/1.0/bulk:response',
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
	};

export const GET_ISSUE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetIssueResponse> =
	{
		$id: 'jira-software-cloud-api:get:/rest/api/3/issue/$issueIdOrKey:response',
		type: 'object',
		properties: {
			id: { type: 'string' },
			key: { type: 'string' },
			self: { type: 'string' },
			fields: {
				type: 'object',
				properties: {
					summary: { type: 'string' },
				},
				required: ['summary'],
			},
		},
		required: ['id', 'key', 'self'],
	};

export const CHECK_PERMISSIONS_RESPONSE_SCHEMA: JSONSchemaTypeWithId<CheckPermissionsResponse> =
	{
		$id: 'jira-software-cloud-api:post:/rest/api/3/permissions/check:response',
		type: 'object',
		properties: {
			globalPermissions: {
				type: 'array',
				items: { type: 'string' },
			},
		},
		required: ['globalPermissions'],
	};
