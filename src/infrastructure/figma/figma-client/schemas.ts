/**
 * Contains JSON schema definitions for Figma API responses. Used for validating the types of incoming data on the entry
 * points to the application.
 */
import type {
	CreateDevResourcesResponse,
	CreateWebhookResponse,
	DevResource,
	ErrorResponse,
	GetDevResourcesResponse,
	GetFileMetaResponse,
	GetFileResponse,
	GetMeResponse,
	GetOAuth2TokenResponse,
	GetTeamProjectsResponse,
	Node,
	NodeDevStatus,
	RefreshOAuth2TokenResponse,
} from './types';

import type {
	JSONSchemaType,
	JSONSchemaTypeWithId,
} from '../../../common/schema-validation';

export const GET_OAUTH2_TOKEN_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetOAuth2TokenResponse> =
	{
		$id: 'figma-api:get:api/oauth/token:response',
		type: 'object',
		properties: {
			access_token: { type: 'string' },
			expires_in: { type: 'number' },
			refresh_token: { type: 'string' },
		},
		required: ['access_token', 'expires_in', 'refresh_token'],
	};

export const REFRESH_OAUTH2_TOKEN_RESPONSE_SCHEMA: JSONSchemaTypeWithId<RefreshOAuth2TokenResponse> =
	{
		$id: 'figma-api:api/oauth/refresh:response',
		type: 'object',
		properties: {
			access_token: { type: 'string' },
			expires_in: { type: 'number' },
		},
		required: ['access_token', 'expires_in'],
	};

const NODE_DEV_STATUS_SCHEMA: JSONSchemaType<NodeDevStatus> = {
	type: 'object',
	properties: {
		type: { type: 'string' },
	},
	required: ['type'],
};

const NODE_SCHEMA = {
	$id: 'figma-api:get:v1/files/$fileKey:response:node',
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string' },
		type: { type: 'string' },
		devStatus: { ...NODE_DEV_STATUS_SCHEMA, nullable: true },
		lastModified: { type: 'string', nullable: true },
		children: {
			type: 'array',
			items: { $ref: '#' },
		},
	},
	required: ['id', 'name', 'type'],
	// Since TypeScript cannot infer recursive types, use a type assertion as a workaround.
} as JSONSchemaType<Omit<Node, 'children'>> as JSONSchemaType<Node>;

export const GET_FILE_META_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetFileMetaResponse> =
	{
		$id: 'figma-api:get:v1/files/$fileKey/meta:response',
		type: 'object',
		properties: {
			file: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					last_touched_at: { type: 'string' },
					last_touched_by: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							email: { type: 'string' },
						},
						required: ['id'],
					},
					editorType: { type: 'string' },
				},
				required: ['name', 'editorType', 'last_touched_at'],
			},
		},
		required: ['file'],
	};

export const GET_FILE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetFileResponse> = {
	$id: 'figma-api:get:v1/files/$fileKey:response',
	type: 'object',
	properties: {
		name: { type: 'string' },
		lastModified: { type: 'string' },
		editorType: { type: 'string' },
		document: NODE_SCHEMA,
	},
	required: ['name', 'editorType', 'lastModified', 'document'],
};

export const GET_ME_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetMeResponse> = {
	$id: 'figma-api:get:v1/me:response',
	type: 'object',
	properties: {
		id: { type: 'string' },
		email: { type: 'string' },
	},
	required: ['id', 'email'],
};

const DEV_RESOURCE_SCHEMA: JSONSchemaType<DevResource> = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string' },
		url: { type: 'string' },
		file_key: { type: 'string' },
		node_id: { type: 'string' },
	},
	required: ['id', 'name', 'url', 'file_key', 'node_id'],
};

export const CREATE_DEV_RESOURCE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<CreateDevResourcesResponse> =
	{
		$id: 'figma-api:post:v1/dev_resources:response',
		type: 'object',
		properties: {
			errors: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						file_key: { type: 'string' },
						node_id: { type: 'string' },
						error: { type: 'string' },
					},
					required: ['error'],
				},
			},
		},
		required: ['errors'],
	};

export const GET_DEV_RESOURCE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetDevResourcesResponse> =
	{
		$id: 'figma-api:get:v1/files/$fileKey/dev_resources:response',
		type: 'object',
		properties: {
			dev_resources: {
				type: 'array',
				items: DEV_RESOURCE_SCHEMA,
			},
		},
		required: ['dev_resources'],
	};

export const CREATE_WEBHOOK_RESPONSE: JSONSchemaTypeWithId<CreateWebhookResponse> =
	{
		$id: 'figma-api:post:v2/webhooks:response',
		type: 'object',
		properties: {
			id: { type: 'string' },
			team_id: { type: 'string' },
			event_type: { type: 'string' },
			client_id: { type: 'string' },
			endpoint: { type: 'string' },
			passcode: { type: 'string' },
			status: { type: 'string' },
			description: { type: 'string' },
			protocol_version: { type: 'string' },
		},
		required: [
			'id',
			'team_id',
			'event_type',
			'client_id',
			'endpoint',
			'passcode',
			'status',
			'protocol_version',
		],
	};

export const GET_TEAM_PROJECTS_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetTeamProjectsResponse> =
	{
		$id: 'figma-api:get:/v1/teams/$teamId/projects:response',
		type: 'object',
		properties: {
			name: { type: 'string' },
			projects: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						name: { type: 'string' },
					},
					required: ['id', 'name'],
				},
			},
		},
		required: ['name', 'projects'],
	};

export const ERROR_RESPONSE_SCHEMA: JSONSchemaTypeWithId<ErrorResponse> = {
	$id: 'figma-api:error:response',
	type: 'object',
	properties: {
		message: { type: 'string' },
		reason: { type: 'string', nullable: true },
	},
	required: ['message'],
};
