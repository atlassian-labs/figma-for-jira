import { v4 as uuidv4 } from 'uuid';

import type { NodeDetails } from './figma-client';

export const MOCK_NODE_ID_URL = '1-2';
export const MOCK_FILE_KEY = '5BnX6YnPJOvOHRdiB0seWx';
export const PROTOTYPE_URL = `https://www.figma.com/proto/${MOCK_FILE_KEY}/Design?node-id=${MOCK_NODE_ID_URL}`;
export const DESIGN_URL_WITH_NODE = `https://www.figma.com/file/${MOCK_FILE_KEY}/Design?node-id=${MOCK_NODE_ID_URL}&mode=dev`;
export const DESIGN_URL_WITHOUT_NODE = `https://www.figma.com/file/${MOCK_FILE_KEY}/Design?mode=dev`;
export const INVALID_DESIGN_URL = 'https://www.figma.com';
export const MOCK_FILE_NAME = 'Test File';
export const MOCK_NODE_ID = '1:2';
export const MOCK_LAST_MODIFIED = '2023-08-29T03:17:29Z';
export const MOCK_VERSION = '4067551197';
const SITE_ID = uuidv4();
const ISSUE_ID = 10000;
export const INVALID_ISSUE_ARI = `ari:cloud:jira:123:issue/${ISSUE_ID}`;
export const VALID_ISSUE_ARI = `ari:cloud:jira:${SITE_ID}:issue/${ISSUE_ID}`;
export const MOCK_VALID_ASSOCIATION = {
	ari: VALID_ISSUE_ARI,
};

export const MOCK_DOCUMENT: NodeDetails = {
	id: MOCK_NODE_ID,
	name: 'Test Node',
	type: 'FRAME',
};

export const mockGetFileNodesResponse = ({
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
}) => ({
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

export const mockGetFileResponse = ({
	name = MOCK_FILE_NAME,
	lastModified = MOCK_LAST_MODIFIED,
	version = MOCK_VERSION,
}: {
	name?: string;
	lastModified?: string;
	version?: string;
}) => ({
	name,
	lastModified,
	thumbnailUrl: '',
	version,
	role: 'editor',
	editorType: 'figma',
	linkAccess: 'org_edit',
	document: MOCK_DOCUMENT,
});
