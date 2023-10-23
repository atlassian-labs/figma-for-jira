import type { JSONSchemaType } from 'ajv';

import type {
	CreateDevResourceError,
	CreateDevResourcesResponse,
	CreateWebhookResponse,
	DevResource,
	FileResponse,
	GetDevResourcesResponse,
	GetOAuth2TokenResponse,
	GetTeamProjectsResponse,
	MeResponse,
	Node,
	NodeDevStatus,
	Project,
	RefreshOAuth2TokenResponse,
} from './types';

import type { JSONSchemaTypeWithId } from '../../ajv';

const NODE_DEV_STATUS_SCHEMA: JSONSchemaType<NodeDevStatus> = {
	type: 'object',
	properties: {
		type: { type: 'string' },
	},
	required: ['type'],
};

const NODE_SCHEMA = {
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
} as JSONSchemaType<Omit<Node, 'children'>> as JSONSchemaType<Node>;

export const FILE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<FileResponse> = {
	$id: 'figma-api:file-response:value',
	type: 'object',
	properties: {
		name: { type: 'string' },
		role: { type: 'string' },
		lastModified: { type: 'string' },
		editorType: { type: 'string' },
		document: NODE_SCHEMA,
	},
	required: ['name', 'role', 'editorType', 'lastModified', 'document'],
};

export const ME_RESPONSE_SCHEMA: JSONSchemaTypeWithId<MeResponse> = {
	$id: 'figma-api:me-response:value',
	type: 'object',
	properties: {
		id: { type: 'string' },
		email: { type: 'string' },
		handle: { type: 'string' },
		img_url: { type: 'string' },
	},
	required: ['id', 'email', 'handle', 'img_url'],
};

export const REFRESH_OAUTH2_TOKEN_RESPONSE_SCHEMA: JSONSchemaTypeWithId<RefreshOAuth2TokenResponse> =
	{
		$id: 'figma-api:refresh-oauth2-token-response:value',
		type: 'object',
		properties: {
			access_token: { type: 'string' },
			expires_in: { type: 'number' },
		},
		required: ['access_token', 'expires_in'],
	};

export const GET_OAUTH2_TOKEN_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetOAuth2TokenResponse> =
	{
		$id: 'figma-api:get-oauth2-token-response:value',
		type: 'object',
		properties: {
			access_token: { type: 'string' },
			expires_in: { type: 'number' },
			refresh_token: { type: 'string' },
		},
		required: ['access_token', 'expires_in', 'refresh_token'],
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

const CREATED_DEV_RESOURCE_ERROR_SCHEMA: JSONSchemaType<CreateDevResourceError> =
	{
		type: 'object',
		properties: {
			file_key: { type: 'string' },
			node_id: { type: 'string' },
			error: { type: 'string' },
		},
		required: ['error'],
	};

export const CREATE_DEV_RESOURCE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<CreateDevResourcesResponse> =
	{
		$id: 'figma-api:create-dev-resource-response:value',
		type: 'object',
		properties: {
			links_created: {
				type: 'array',
				items: DEV_RESOURCE_SCHEMA,
			},
			errors: {
				type: 'array',
				items: CREATED_DEV_RESOURCE_ERROR_SCHEMA,
			},
		},
		required: ['links_created', 'errors'],
	};

export const GET_DEV_RESOURCE_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetDevResourcesResponse> =
	{
		$id: 'figma-api:get-dev-resource-response:value',
		type: 'object',
		properties: {
			dev_resources: {
				type: 'array',
				items: DEV_RESOURCE_SCHEMA,
			},
		},
		required: ['dev_resources'],
	};

const PROJECT_SCHEMA: JSONSchemaType<Project> = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		name: { type: 'string' },
	},
	required: ['id', 'name'],
};

export const GET_TEAM_PROJECTS_RESPONSE_SCHEMA: JSONSchemaTypeWithId<GetTeamProjectsResponse> =
	{
		$id: 'figma-api:get-team-projects-response:value',
		type: 'object',
		properties: {
			name: { type: 'string' },
			projects: {
				type: 'array',
				items: PROJECT_SCHEMA,
			},
		},
		required: ['name', 'projects'],
	};

export const CREATE_WEBHOOK_RESPONSE: JSONSchemaTypeWithId<CreateWebhookResponse> =
	{
		$id: 'figma-api:create-webhook-response:value',
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
