import type { JSONSchemaType } from 'ajv';

import type { AttachedDesignUrlV2IssuePropertyValue } from './jira-service';

import type { JSONSchemaTypeWithId } from '../ajv';
import type {
	FileResponse,
	Node,
	NodeDevStatus,
} from '../figma/figma-client/types';

export const ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA: JSONSchemaTypeWithId<
	AttachedDesignUrlV2IssuePropertyValue[]
> = {
	$id: 'jira-software-cloud-api:attached-design-url-v2:value',
	type: 'array',
	items: {
		type: 'object',
		properties: {
			url: { type: 'string' },
			name: { type: 'string' },
		},
		required: ['url', 'name'],
	},
};

export const NODE_DEV_STATUS_SCHEMA: JSONSchemaType<NodeDevStatus> = {
	type: 'object',
	properties: {
		type: { type: 'string' },
	},
	required: ['type'],
};

const NODE_SCHEMA = {
	$id: 'figma-api:node:value',
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
} as JSONSchemaTypeWithId<Omit<Node, 'children'>> as JSONSchemaTypeWithId<Node>;

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
