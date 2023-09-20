import { v4 as uuidv4 } from 'uuid';

import type {
	AssociatedFigmaDesign,
	AssociatedFigmaDesignCreateParams,
	AtlassianDesign,
	ConnectInstallation,
	ConnectInstallationCreateParams,
	FigmaTeam,
	FigmaTeamCreateParams,
	FigmaUserCredentialsCreateParams,
	JiraIssue,
} from '..';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
	FigmaTeamAuthStatus,
} from '..';
import { Duration } from '../../../common/duration';
import { generateRandomInteger } from '../../../common/testing/mocks';

export const MOCK_ISSUE_ID = '10000';
export const MOCK_ISSUE_KEY = 'FIG-1';
export const MOCK_ISSUE_URL = `https://myjirainstance.atlassian.net/browse/${MOCK_ISSUE_KEY}`;
export const MOCK_ISSUE_TITLE = 'Test Jira Issue';

export const MOCK_FIGMA_FILE_KEY = '5BnX6YnPJOvOHRdiB0seWx';
export const MOCK_FIGMA_NODE_ID = '100:42';
export const MOCK_FILE_FIGMA_DESIGN_IDENTIFIER = new FigmaDesignIdentifier(
	MOCK_FIGMA_FILE_KEY,
);
export const MOCK_NODE_FIGMA_DESIGN_IDENTIFIER = new FigmaDesignIdentifier(
	MOCK_FIGMA_FILE_KEY,
	MOCK_FIGMA_NODE_ID,
);
export const MOCK_FIGMA_DESIGN_IDENTIFIER = MOCK_FILE_FIGMA_DESIGN_IDENTIFIER;

function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min) + min);
}

export const generateFigmaFileName = () => uuidv4();

export const generateFigmaFileKey = () =>
	Buffer.from(uuidv4()).toString('base64');

export const generateFigmaNodeId = () =>
	`${getRandomInt(1, 100)}:${getRandomInt(1, 100)}`;

export const generateNodeId = (): string =>
	`${generateRandomInteger()}:${generateRandomInteger()}`;

export const generateFigmaDesignIdentifier = ({
	fileKey = uuidv4(),
	nodeId = generateNodeId(),
}: { fileKey?: string; nodeId?: string } = {}) =>
	new FigmaDesignIdentifier(fileKey, nodeId);

export const generateFigmaDesignUrl = ({
	fileKey = generateFigmaFileKey(),
	nodeId,
	fileName = generateFigmaFileName(),
	mode,
}: {
	fileKey?: string;
	nodeId?: string;
	fileName?: string;
	mode?: string;
} = {}) => {
	const url = new URL(`https://www.figma.com/file/${fileKey}/${fileName}`);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	if (mode) {
		url.searchParams.append('mode', mode);
	}

	return url.toString();
};

export const generateIssueId = () =>
	getRandomInt(1000, Number.MAX_SAFE_INTEGER).toString();

export const generateIssueAri = (issueId = generateIssueId()) =>
	`ari:cloud:jira:${uuidv4()}:issue/${issueId}`;

export const generateFigmaOAuth2UserCredentials = ({
	id = Date.now(),
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(),
} = {}): FigmaOAuth2UserCredentials =>
	new FigmaOAuth2UserCredentials(
		id,
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
	);

export const generateFigmaUserCredentialsCreateParams = ({
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(Date.now() + Duration.ofMinutes(120).asMilliseconds),
} = {}): FigmaUserCredentialsCreateParams => ({
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresAt,
});

export const generateConnectInstallationCreateParams = ({
	key = uuidv4(),
	clientKey = uuidv4(),
	sharedSecret = uuidv4(),
	baseUrl = `https://${uuidv4()}.atlassian.com`,
	displayUrl = `https://${uuidv4()}.atlassian.com`,
} = {}): ConnectInstallationCreateParams => ({
	key,
	clientKey,
	sharedSecret,
	baseUrl,
	displayUrl,
});

export const generateConnectInstallation = ({
	id = Date.now(),
	key = uuidv4(),
	clientKey = uuidv4(),
	sharedSecret = uuidv4(),
	baseUrl = `https://${uuidv4()}.atlassian.com`,
	displayUrl = `https://${uuidv4()}.atlassian.com`,
} = {}): ConnectInstallation => ({
	id,
	key,
	clientKey,
	sharedSecret,
	baseUrl,
	displayUrl,
});

export const generateAtlassianDesign = ({
	id = uuidv4(),
	displayName = `Design ${uuidv4()}`,
	url = `https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/${displayName}?type=design&node-id=0-1&mode=design`,
	liveEmbedUrl = `https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/${displayName}?type=design&node-id=0-1&mode=design`,
	status = AtlassianDesignStatus.UNKNOWN,
	type = AtlassianDesignType.FILE,
	lastUpdated = new Date().toISOString(),
	updateSequenceNumber = Date.now(),
} = {}): AtlassianDesign => ({
	id,
	displayName,
	url,
	liveEmbedUrl,
	status,
	type,
	lastUpdated,
	updateSequenceNumber,
});

export const generateJiraIssue = ({
	id = uuidv4(),
	key = uuidv4(),
	self = 'https://myjirainstance.atlassian.net/browse/FIG-1',
	fields = {
		summary: `Issue ${uuidv4()}`,
	},
} = {}): JiraIssue => ({
	id,
	key,
	self,
	fields,
});

export const generateAssociatedFigmaDesignCreateParams = ({
	designId = generateFigmaDesignIdentifier(),
	connectInstallationId = Math.floor(Math.random() * 10000),
}: Partial<AssociatedFigmaDesignCreateParams> = {}): AssociatedFigmaDesignCreateParams => ({
	designId,
	connectInstallationId,
});

export const generateAssociatedFigmaDesign = ({
	id = generateRandomInteger(),
	designId = generateFigmaDesignIdentifier(),
	connectInstallationId = Math.floor(Math.random() * 10000),
}: Partial<AssociatedFigmaDesign> = {}): AssociatedFigmaDesign => ({
	id,
	designId,
	connectInstallationId,
});

export const generateFigmaTeamCreateParams = ({
	webhookId = uuidv4(),
	teamId = uuidv4(),
	teamName = 'Team Name',
	figmaAdminAtlassianUserId = uuidv4(),
	status = FigmaTeamAuthStatus.OK,
	connectInstallationId = generateRandomInteger(),
}: Partial<FigmaTeamCreateParams> = {}): FigmaTeamCreateParams => ({
	webhookId,
	teamId,
	teamName,
	figmaAdminAtlassianUserId,
	status,
	connectInstallationId,
});

export const generateFigmaTeam = ({
	id = generateRandomInteger(),
	webhookId = uuidv4(),
	teamId = uuidv4(),
	teamName = 'Team Name',
	figmaAdminAtlassianUserId = uuidv4(),
	status = FigmaTeamAuthStatus.OK,
	connectInstallationId = generateRandomInteger(),
}: Partial<FigmaTeam> = {}): FigmaTeam => ({
	id,
	webhookId,
	teamId,
	teamName,
	figmaAdminAtlassianUserId,
	status,
	connectInstallationId,
});
