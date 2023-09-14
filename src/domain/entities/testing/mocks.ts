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
	FigmaOAuth2UserCredentials,
} from '..';
import { Duration } from '../../../common/duration';

export const MOCK_ISSUE_ID = '10000';
export const MOCK_ISSUE_KEY = 'FIG-1';
export const MOCK_ISSUE_URL = `https://myjirainstance.atlassian.net/browse/${MOCK_ISSUE_KEY}`;
export const MOCK_ISSUE_TITLE = 'Test Jira Issue';

export const generateIssueAri = (issueId = Date.now().toString()) =>
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
