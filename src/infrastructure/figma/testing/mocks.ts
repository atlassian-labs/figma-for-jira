import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../common/duration';
import type {
	GetDevResourcesResponse,
	GetOAuth2TokenResponse,
	NodeDetails,
	RefreshOAuth2TokenResponse,
} from '../figma-client';

export const MOCK_NODE_ID_URL = '1-2';
export const MOCK_FILE_KEY = '5BnX6YnPJOvOHRdiB0seWx';
export const MOCK_FILE_NAME = 'Test-File';
export const MOCK_PROTOTYPE_URL = `https://www.figma.com/proto/${MOCK_FILE_KEY}/${MOCK_FILE_NAME}?node-id=${MOCK_NODE_ID_URL}`;
export const MOCK_DESIGN_URL_WITH_NODE = `https://www.figma.com/file/${MOCK_FILE_KEY}/${MOCK_FILE_NAME}?node-id=${MOCK_NODE_ID_URL}&mode=dev`;
export const MOCK_DESIGN_URL_WITHOUT_NODE = `https://www.figma.com/file/${MOCK_FILE_KEY}/${MOCK_FILE_NAME}?mode=dev`;
export const MOCK_INVALID_DESIGN_URL = 'https://www.figma.com';
export const MOCK_NODE_ID = '1:2';
export const MOCK_LAST_MODIFIED = '2023-08-29T03:17:29Z';
export const MOCK_VERSION = '4067551197';
export const MOCK_ISSUE_KEY = 'FIG-1';
export const MOCK_ISSUE_URL = `https://myjirainstance.atlassian.net/browse/${MOCK_ISSUE_KEY}`;
export const MOCK_ISSUE_TITLE = 'Test Jira Issue';
export const MOCK_DEV_RESOURCE_ID = uuidv4();
export const MOCK_DOCUMENT: NodeDetails = {
	id: MOCK_NODE_ID,
	name: 'Test Node',
	type: 'FRAME',
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

export const generateGetFileNodesResponse = ({
	name = MOCK_FILE_NAME,
	lastModified = MOCK_LAST_MODIFIED,
	version = MOCK_VERSION,
	nodeId = MOCK_NODE_ID,
	document = MOCK_DOCUMENT,
}: {
	name?: string;
	lastModified?: string;
	version?: string;
	nodeId?: string;
	document?: NodeDetails;
} = {}) => ({
	name,
	lastModified,
	version,
	role: 'owner',
	editorType: 'figma',
	linkAccess: 'org_view',
	thumbnailUrl: '',
	err: '',
	nodes: {
		[nodeId]: {
			document,
			components: {},
			componentSets: {},
			schemaVersion: 0,
			styles: {},
		},
	},
});

export const generateGetFileResponse = ({
	name = MOCK_FILE_NAME,
	lastModified = MOCK_LAST_MODIFIED,
	version = MOCK_VERSION,
}: {
	name?: string;
	lastModified?: string;
	version?: string;
} = {}) => ({
	name,
	lastModified,
	thumbnailUrl: '',
	version,
	role: 'editor',
	editorType: 'figma',
	linkAccess: 'org_edit',
	document: MOCK_DOCUMENT,
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
