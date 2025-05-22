import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../../common/duration';
import type { AtlassianProviderUser } from '../../../../domain/entities';
import {
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateJiraIssueId,
	generateJiraIssueKey,
	generateJiraIssueUrl,
} from '../../../../domain/entities/testing';
import type { JwtTokenParams } from '../jwt-utils';
import type {
	CheckPermissionsRequest,
	CheckPermissionsResponse,
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../types';

export const MOCK_JWT_TOKEN_PARAMS: JwtTokenParams = {
	request: {
		method: 'GET',
		pathname: `/rest/api/3/issue/${uuidv4()}`,
		query: {
			param1: uuidv4,
		},
	},
	connectAppKey: uuidv4(),
	connectSharedSecret: uuidv4(),
	expiresIn: Duration.ofMinutes(10),
};

export const MOCK_JWT_TOKEN = 'test-jwt-token';

export const generateSubmitDesignsRequest = (
	designs: {
		id?: string;
		displayName?: string;
		url?: string;
		liveEmbedUrl?: string;
		inspectUrl?: string;
		status?: string;
		type?: string;
		lastUpdated?: string;
		lastUpdatedBy?: AtlassianProviderUser;
		iconUrl?: string;
		updateSequenceNumber?: number;
	}[] = [{}],
): SubmitDesignsRequest => ({
	designs: designs.map(
		({
			id = `${generateFigmaFileKey()}/${generateFigmaNodeId()}`,
			displayName = `Design ${uuidv4()}`,
			url = `https://www.figma.com/file/${id}/${displayName}?type=design&mode=design`,
			liveEmbedUrl = `https://www.figma.com/file/${id}/${displayName}?type=design&mode=design`,
			inspectUrl = `https://www.figma.com/file/${id}/${displayName}?mode=dev",`,
			status = 'UNKNOWN',
			type = 'FILE',
			lastUpdated = new Date().toISOString(),
			lastUpdatedBy,
			updateSequenceNumber = Date.now(),
		}) => ({
			id,
			displayName,
			url,
			liveEmbedUrl,
			inspectUrl,
			status,
			type,
			lastUpdated,
			lastUpdatedBy,
			updateSequenceNumber,
		}),
	),
});

export const generateSuccessfulSubmitDesignsResponse = (
	designIds = [uuidv4()],
): SubmitDesignsResponse => ({
	acceptedEntities: designIds.map((entityId) => ({
		entityType: 'design',
		entityId,
	})),
	rejectedEntities: [],
});

export const generateFailedSubmitDesignsResponse = (
	designIds = [uuidv4()],
): SubmitDesignsResponse => ({
	acceptedEntities: [],
	rejectedEntities: designIds.map((entityId) => ({
		key: { entityId, entityType: 'design' },
		errors: [{ message: 'Failure' }],
	})),
});

export const generateGetIssueResponse = ({
	id = generateJiraIssueId(),
	key = generateJiraIssueKey(),
	self = generateJiraIssueUrl({ key }).toString(),
	fields = {
		summary: `Issue ${key}`,
	},
} = {}): GetIssueResponse => ({
	id,
	key,
	self,
	fields,
});

export const generateCheckPermissionsRequest = ({
	accountId = uuidv4(),
	globalPermissions = ['ADMINISTER'],
}: Partial<CheckPermissionsRequest> = {}): CheckPermissionsRequest => ({
	accountId,
	globalPermissions,
});

export const generateCheckPermissionsResponse = ({
	globalPermissions = ['ADMINISTER'],
}: Partial<CheckPermissionsResponse> = {}): CheckPermissionsResponse => ({
	globalPermissions,
});
