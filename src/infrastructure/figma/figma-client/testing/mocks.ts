import { v4 as uuidv4 } from 'uuid';

import type {
	GetDevResourcesResponse,
	GetOAuth2TokenResponse,
	Node,
	RefreshOAuth2TokenResponse,
} from '..';
import { Duration } from '../../../../common/duration';
import {
	generateFigmaFileKey,
	generateFigmaFileName,
	MOCK_FIGMA_FILE_KEY,
	MOCK_FIGMA_NODE_ID,
	MOCK_ISSUE_URL,
} from '../../../../domain/entities/testing';
import type { FigmaWebhookEventPayload } from '../../schemas';

export const MOCK_FILE_KEY = MOCK_FIGMA_FILE_KEY;
export const MOCK_NODE_ID = MOCK_FIGMA_NODE_ID;
export const MOCK_FILE_NAME = 'Test-File';
export const MOCK_TIMESTAMP = '2023-08-29T03:17:29Z';
export const MOCK_LAST_MODIFIED = MOCK_TIMESTAMP;
export const MOCK_VERSION = '4067551197';
export const MOCK_DEV_RESOURCE_ID = uuidv4();
export const MOCK_DOCUMENT: Node = {
	id: '0:0',
	name: 'Document',
	type: 'DOCUMENT',
};
export const MOCK_FRAME: Node = {
	id: '1:2',
	name: 'Test Frame 1:2',
	type: 'FRAME',
};
export const MOCK_CHILD_NODE: Node = {
	id: '1:3',
	name: 'Test Rectangle 1:3',
	type: 'RECTANGLE',
};

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
	name = MOCK_FILE_NAME,
	lastModified = MOCK_LAST_MODIFIED,
	version = MOCK_VERSION,
	document = MOCK_DOCUMENT,
} = {}) => ({
	name,
	lastModified,
	thumbnailUrl: '',
	version,
	role: 'editor',
	editorType: 'figma',
	linkAccess: 'org_edit',
	document: document,
});

export const generateGetFileResponseWithNode = ({
	name = MOCK_FILE_NAME,
	lastModified = MOCK_LAST_MODIFIED,
	version = MOCK_VERSION,
	node = MOCK_CHILD_NODE,
} = {}) => ({
	name,
	lastModified,
	thumbnailUrl: '',
	version,
	role: 'editor',
	editorType: 'figma',
	linkAccess: 'org_edit',
	document: {
		...MOCK_DOCUMENT,
		children: [
			{
				...MOCK_FRAME,
				children: [node],
			},
		],
	},
});

export const generateGetDevResourcesResponse = ({
	id = MOCK_DEV_RESOURCE_ID,
	name = 'Mock dev resource',
	url = MOCK_ISSUE_URL,
	file_key = MOCK_ISSUE_URL,
	node_id = MOCK_ISSUE_URL,
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

export const generateFigmaWebhookEventPayload = ({
	event_type = 'FILE_UPDATE',
	file_key = generateFigmaFileKey(),
	file_name = generateFigmaFileName(),
	passcode = 'passcode',
	protocol_version = '2',
	retries = 0,
	timestamp = MOCK_TIMESTAMP,
	webhook_id = uuidv4(),
	triggered_by = undefined,
}: Partial<FigmaWebhookEventPayload> = {}): FigmaWebhookEventPayload => ({
	event_type,
	file_key,
	file_name,
	passcode,
	protocol_version,
	retries,
	timestamp,
	webhook_id,
	triggered_by,
});
