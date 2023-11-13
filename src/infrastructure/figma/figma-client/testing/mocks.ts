import { v4 as uuidv4 } from 'uuid';

import type {
	CreateDevResourceError,
	CreateDevResourcesRequest,
	CreateDevResourcesResponse,
	CreateWebhookRequest,
	CreateWebhookResponse,
	GetDevResourcesResponse,
	GetFileMetaResponse,
	GetFileResponse,
	GetMeResponse,
	GetOAuth2TokenResponse,
	GetTeamProjectsResponse,
	Node,
	NodeDevStatus,
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
	devStatus,
	children = [],
}: {
	id?: string;
	lastModified?: Date;
	devStatus?: NodeDevStatus;
	children?: Node[];
} = {}): Node => ({
	id,
	name: `Test Frame ${id}`,
	type: 'FRAME',
	devStatus: devStatus,
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

export const generateGetMeResponse = ({
	id = uuidv4(),
	email = `uuidv4@figma.com`,
} = {}): GetMeResponse => ({
	id,
	email,
});

export const generateGetFileMetaResponse = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
} = {}): GetFileMetaResponse => ({
	file: {
		name,
		last_touched_at: lastModified.toISOString(),
		editorType: 'figma',
	},
});

export const generateGetFileResponse = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
	document = MOCK_DOCUMENT,
} = {}): GetFileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
	editorType: 'figma',
	document: document,
});

export const generateGetFileResponseWithNode = ({
	name = generateFigmaFileName(),
	lastModified = new Date(),
	node = generateChildNode(),
} = {}): GetFileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
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
} = {}): GetFileResponse => ({
	name,
	lastModified: lastModified.toISOString(),
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
	dev_resources: [
		{
			name,
			url,
			file_key: fileKey,
			node_id: nodeId,
		},
	],
});

export const generateCreateDevResourcesResponse = ({
	errors = [],
}: {
	errors?: CreateDevResourceError[];
} = {}): CreateDevResourcesResponse => ({
	errors,
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

export const generateCreateWebhookRequest = ({
	teamId = uuidv4(),
	eventType = 'FILE_UPDATE',
	endpoint = `https://figma-for-jira.atlassian.com/figma/webhooks`,
	passcode = uuidv4(),
	description = 'Figma for Jira',
} = {}): CreateWebhookRequest => ({
	team_id: teamId,
	event_type: eventType,
	endpoint,
	passcode,
	description,
});

export const generateCreateWebhookResponse = ({
	id = uuidv4(),
	teamId = uuidv4(),
	eventType = 'FILE_UPDATE',
	clientId = uuidv4(),
	endpoint = `https://figma-for-jira.atlassian.com/figma/webhooks`,
	passcode = uuidv4(),
	status = 'ACTIVE',
	description = 'Figma for Jira',
	protocolVersion = '2',
} = {}): CreateWebhookResponse => ({
	id: id,
	team_id: teamId,
	event_type: eventType,
	client_id: clientId,
	endpoint,
	passcode,
	status,
	description,
	protocol_version: protocolVersion,
});

export const generateGetTeamProjectsResponse = ({
	name = `Team ${uuidv4()}`,
} = {}): GetTeamProjectsResponse => ({
	name,
	projects: [],
});
