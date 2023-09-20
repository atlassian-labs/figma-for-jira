import { v4 as uuidv4 } from 'uuid';

import type {
	AtlassianDesign,
	ConnectInstallation,
	ConnectInstallationCreateParams,
	FigmaUserCredentialsCreateParams,
	JiraIssue,
} from '..';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
} from '..';
import { Duration } from '../../../common/duration';
import {
	getRandomInt,
	getRandomPositiveInt,
} from '../../../common/testing/utils';

export const generateFigmaFileName = () => uuidv4();

export const generateFigmaFileKey = () =>
	Buffer.from(uuidv4()).toString('base64');

export const generateFigmaNodeId = () =>
	`${getRandomInt(1, 100)}:${getRandomInt(1, 100)}`;

export const generateFigmaDesignIdentifier = ({
	fileKey = generateFigmaFileKey(),
	nodeId = undefined,
}: {
	fileKey?: string;
	nodeId?: string;
} = {}) => new FigmaDesignIdentifier(fileKey, nodeId);

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
	id = getRandomInt(1, 1000),
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

export const generateJiraIssueId = () => getRandomPositiveInt().toString();

export const generateJiraIssueKey = () => `KEY-${getRandomPositiveInt()}`;

export const generateJiraIssueUrl = ({
	baseUrl = `https://${uuidv4()}.atlassian.net`,
	key = generateJiraIssueKey(),
} = {}) => new URL(`/browse/${key}`, baseUrl).toString();

export const generateJiraIssueAri = (issueId = generateJiraIssueId()) =>
	`ari:cloud:jira:${uuidv4()}:issue/${issueId}`;

export const generateJiraIssue = ({
	id = generateJiraIssueId(),
	key = generateJiraIssueKey(),
	self = generateJiraIssueUrl({ key }),
	fields = {
		summary: `Issue ${key}`,
	},
} = {}): JiraIssue => ({
	id,
	key,
	self,
	fields,
});
