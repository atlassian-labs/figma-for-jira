import type { JSONSchemaType } from 'ajv';

import type { FileResponse, Node, NodeDevStatus } from './types';

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
