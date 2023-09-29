import { v4 as uuidv4 } from 'uuid';

import type {
	CreateDevResourcesRequest,
	FileResponse,
	GetDevResourcesResponse,
	GetOAuth2TokenResponse,
	Node,
	RefreshOAuth2TokenResponse,
} from '..';
import { Duration } from '../../../../common/duration';
import {
	generateFigmaFileKey,
	generateFigmaFileName,
	generateFigmaNodeId,
	generateJiraIssueUrl,
} from '../../../../domain/entities/testing';

export const MOCK_DOCUMENT: Node = {
	id: '0:0',
	name: 'Document',
	type: 'DOCUMENT',
};

export const generateFrameNode = ({
	id = generateFigmaNodeId(),
	lastModified,
	children = [],
}: {
	id?: string;
	lastModified?: Date;
	children?: Node[];
} = {}): Node => ({
	id,
	name: `Test Frame ${id}`,
	type: 'FRAME',
	lastModified: lastModified?.toISOString(),
	children,
});

export const generateChildNode = ({
	id = generateFigmaNodeId(),
} = {}): Node => ({
	id,
	name: `Test Rectangle ${id}`,
	type: 'RECTANGLE',
});

export const generateGetOAuth2TokenResponse = ({
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresIn = Duration.ofMinutes(90),
} = {}): GetOAuth2TokenResponse => ({
	access_token: accessToken,
	refresh_token: refreshToken,
	expires_in: expiresIn.asSeconds,
});

export const generateRefreshOAuth2TokenResponse = ({
	accessToken = uuidv4(),
	expiresIn = Duration.ofMinutes(90),
} = {}): RefreshOAuth2TokenResponse => ({
	access_token: accessToken,
	expires_in: expiresIn.asSeconds,
});

export const generateGetOAuth2TokenQueryParams = ({
	client_id = 'client-id',
	client_secret = 'client-secret',
	redirect_uri = 'https://www.example.com/auth/callback',
	code = 'code-123',
	grant_type = 'authorization_code',
} = {}) => ({
	client_id,
	client_secret,
	redirect_uri,
	code,
	grant_type,
});

export const generateRefreshOAuth2TokenQueryParams = ({
	client_id = 'client-id',
	client_secret = 'client-secret',
	refresh_token = 'refresh_token',
} = {}) => ({
	client_id,
	client_secret,
	refresh_token,
});

export const generateGetFileResponse = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
	document = MOCK_DOCUMENT,
} = {}): FileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
	role: 'editor',
	editorType: 'figma',
	document: document,
});

export const generateGetFileResponseWithNode = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
	node = generateChildNode(),
} = {}): FileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
	role: 'editor',
	editorType: 'figma',
	document: {
		...MOCK_DOCUMENT,
		children: [node],
	},
});

export const generateGetFileResponseWithNodes = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
	nodes = [generateChildNode()],
} = {}): FileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
	role: 'editor',
	editorType: 'figma',
	document: {
		...MOCK_DOCUMENT,
		children: nodes,
	},
});

export const generateCreateDevResourcesRequest = ({
	name = 'Mock dev resource',
	url = generateJiraIssueUrl(),
	fileKey = generateFigmaFileKey(),
	nodeId = generateFigmaNodeId(),
}: {
	name?: string;
	url?: string;
	fileKey?: string;
	nodeId?: string;
} = {}): CreateDevResourcesRequest => ({
	name,
	url,
	file_key: fileKey,
	node_id: nodeId,
});

export const generateGetDevResourcesResponse = ({
	id = uuidv4(),
	name = 'Mock dev resource',
	url = generateJiraIssueUrl(),
	file_key = generateFigmaFileKey(),
	node_id = generateFigmaNodeId(),
}: {
	id?: string;
	name?: string;
	url?: string;
	file_key?: string;
	node_id?: string;
} = {}): GetDevResourcesResponse => ({
	dev_resources: [{ id, name, url, file_key, node_id }],
});

export const generateEmptyDevResourcesResponse =
	(): GetDevResourcesResponse => ({
		dev_resources: [],
	});
