import { v4 as uuidv4 } from 'uuid';

import type {
	AssociatedFigmaDesign,
	AssociatedFigmaDesignCreateParams,
	AtlassianDesign,
	ConnectInstallation,
	ConnectInstallationCreateParams,
	ConnectUserInfo,
	FigmaOAuth2UserCredentialsCreateParams,
	FigmaTeamCreateParams,
	FigmaTeamSummary,
	JiraIssue,
} from '..';
import {
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
	FigmaTeam,
	FigmaTeamAuthStatus,
} from '..';
import { Duration } from '../../../common/duration';
import {
	generateNumericStringId,
	getRandomInt,
} from '../../../common/testing/utils';

export const generateFigmaFileName = () => uuidv4();

export const generateFigmaFileKey = () =>
	Buffer.from(uuidv4()).toString('base64');

export const generateFigmaNodeId = () =>
	`${getRandomInt(1, 1000)}:${getRandomInt(1, 1000)}`;

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
	mode,
}: {
	fileKey?: string;
	nodeId?: string;
	mode?: string;
} = {}) => {
	const url = new URL(`https://www.figma.com/file/${fileKey}`);
	if (nodeId) {
		url.searchParams.append('node-id', nodeId);
	}
	if (mode) {
		url.searchParams.append('mode', mode);
	}

	return url.toString();
};

export const generateFigmaOAuth2UserCredentialCreateParams = ({
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(Date.now() + Duration.ofMinutes(120).asMilliseconds),
	connectInstallationId = generateNumericStringId(),
} = {}): FigmaOAuth2UserCredentialsCreateParams => ({
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresAt,
	connectInstallationId,
});

export const generateExpiredFigmaOAuth2UserCredentialCreateParams = ({
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	connectInstallationId = generateNumericStringId(),
} = {}): FigmaOAuth2UserCredentialsCreateParams => ({
	atlassianUserId,
	accessToken,
	refreshToken,
	expiresAt: new Date(Date.now() - Duration.ofMinutes(120).asMilliseconds),
	connectInstallationId,
});

export const generateFigmaOAuth2UserCredentials = ({
	id = generateNumericStringId(),
	atlassianUserId = uuidv4(),
	accessToken = uuidv4(),
	refreshToken = uuidv4(),
	expiresAt = new Date(),
	connectInstallationId = generateNumericStringId(),
} = {}): FigmaOAuth2UserCredentials =>
	new FigmaOAuth2UserCredentials(
		id,
		atlassianUserId,
		accessToken,
		refreshToken,
		expiresAt,
		connectInstallationId,
	);

export const generateConnectUserInfo = ({
	atlassianUserId = uuidv4(),
	connectInstallationId = generateNumericStringId(),
} = {}): ConnectUserInfo => ({
	atlassianUserId,
	connectInstallationId,
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
	id = generateNumericStringId(),
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
	id = `${generateFigmaFileKey()}/${generateFigmaNodeId()}`,
	displayName = `Design ${uuidv4()}`,
	url = generateFigmaDesignUrl({
		fileKey: FigmaDesignIdentifier.fromAtlassianDesignId(id).fileKey,
		nodeId: FigmaDesignIdentifier.fromAtlassianDesignId(id).nodeId,
		mode: 'design',
	}),
	liveEmbedUrl = generateFigmaDesignUrl({
		fileKey: FigmaDesignIdentifier.fromAtlassianDesignId(id).fileKey,
		nodeId: FigmaDesignIdentifier.fromAtlassianDesignId(id).nodeId,
		mode: 'design',
	}),
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

export const generateJiraIssueId = () => generateNumericStringId();

export const generateJiraIssueKey = () => `KEY-${generateNumericStringId()}`;

export const generateJiraIssueUrl = ({
	baseUrl = `https://${uuidv4()}.atlassian.net`,
	key = generateJiraIssueKey(),
} = {}) => new URL(`/browse/${key}`, baseUrl).toString();

export const generateJiraIssueAri = ({
	cloudId = uuidv4(),
	issueId = generateJiraIssueId(),
} = {}) => `ari:cloud:jira:${cloudId}:issue/${issueId}`;

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

export const generateAssociatedFigmaDesignCreateParams = ({
	designId = generateFigmaDesignIdentifier(),
	associatedWithAri = generateJiraIssueAri(),
	connectInstallationId = generateNumericStringId(),
}: Partial<AssociatedFigmaDesignCreateParams> = {}): AssociatedFigmaDesignCreateParams => ({
	designId,
	associatedWithAri,
	connectInstallationId,
});

export const generateAssociatedFigmaDesign = ({
	id = generateNumericStringId(),
	designId = generateFigmaDesignIdentifier(),
	associatedWithAri = generateJiraIssueAri(),
	connectInstallationId = generateNumericStringId(),
}: Partial<AssociatedFigmaDesign> = {}): AssociatedFigmaDesign => ({
	id,
	designId,
	associatedWithAri,
	connectInstallationId,
});

export const generateFigmaTeamCreateParams = ({
	webhookId = uuidv4(),
	webhookPasscode = uuidv4(),
	teamId = uuidv4(),
	teamName = uuidv4(),
	figmaAdminAtlassianUserId = uuidv4(),
	authStatus: status = FigmaTeamAuthStatus.OK,
	connectInstallationId = generateNumericStringId(),
}: Partial<FigmaTeamCreateParams> = {}): FigmaTeamCreateParams => ({
	webhookId,
	webhookPasscode,
	teamId,
	teamName,
	figmaAdminAtlassianUserId,
	authStatus: status,
	connectInstallationId,
});

export const generateFigmaTeam = ({
	id = generateNumericStringId(),
	webhookId = uuidv4(),
	webhookPasscode = uuidv4(),
	teamId = uuidv4(),
	teamName = uuidv4(),
	figmaAdminAtlassianUserId = uuidv4(),
	authStatus = FigmaTeamAuthStatus.OK,
	connectInstallationId = generateNumericStringId(),
}: Partial<FigmaTeam> = {}): FigmaTeam =>
	new FigmaTeam({
		id,
		webhookId,
		webhookPasscode,
		teamId,
		teamName,
		figmaAdminAtlassianUserId,
		authStatus,
		connectInstallationId,
	});

export const generateFigmaTeamSummary = ({
	teamId = uuidv4(),
	teamName = uuidv4(),
	authStatus: status = FigmaTeamAuthStatus.OK,
}: Partial<FigmaTeamSummary> = {}): FigmaTeamSummary => ({
	teamId,
	teamName,
	authStatus: status,
});
