import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../../common/duration';
import {
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateJiraIssueId,
	generateJiraIssueKey,
	generateJiraIssueUrl,
} from '../../../../domain/entities/testing';
import type { JwtTokenParams } from '../jwt-utils';
import type {
	Association,
	CheckPermissionsRequest,
	CheckPermissionsResponse,
	GetIssuePropertyResponse,
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../types';

export const MOCK_JWT_TOKEN_PARAMS: JwtTokenParams = {
	request: {
		method: 'GET',
		pathname: `/rest/agile/1.0/issue/${uuidv4()}`,
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
		updateSequenceNumber?: number;
		addAssociations?: Association[] | null;
		removeAssociations?: Association[] | null;
		associationsLastUpdated?: string;
		associationsUpdateSequenceNumber?: number;
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
			updateSequenceNumber = Date.now(),
			addAssociations = null,
			removeAssociations = null,
			associationsLastUpdated = new Date().toISOString(),
			associationsUpdateSequenceNumber = Date.now(),
		}) => ({
			id,
			displayName,
			url,
			liveEmbedUrl,
			inspectUrl,
			status,
			type,
			lastUpdated,
			updateSequenceNumber,
			addAssociations,
			removeAssociations,
			associationsLastUpdated,
			associationsUpdateSequenceNumber,
		}),
	),
});

export const generateSuccessfulSubmitDesignsResponse = (
	designIds = [uuidv4()],
): SubmitDesignsResponse => ({
	acceptedEntities: designIds.map((designId) => ({ designId })),
	rejectedEntities: [],
});

export const generateFailedSubmitDesignsResponse = (
	designIds = [uuidv4()],
): SubmitDesignsResponse => ({
	acceptedEntities: [],
	rejectedEntities: designIds.map((designId) => ({
		key: { designId },
		errors: [{ message: 'Failure' }],
	})),
});

export const generateSubmitDesignsResponseWithUnknownData = ({
	unknownIssueKeys = [uuidv4()],
	unknownAssociations = [
		{
			associationType: 'issueIdOrKeys',
			values: ['unknown'],
		},
	],
} = {}): SubmitDesignsResponse => ({
	acceptedEntities: [],
	rejectedEntities: [],
	unknownIssueKeys,
	unknownAssociations,
});

export const generateGetIssueResponse = ({
	id = generateJiraIssueId(),
	key = generateJiraIssueKey(),
	self = generateJiraIssueUrl({ key }),
	fields = {
		summary: `Issue ${key}`,
	},
} = {}): GetIssueResponse => ({
	id,
	key,
	self,
	fields,
});

export const generateGetIssuePropertyResponse = ({
	key = 'property-key',
	value = 'some value',
}: Partial<GetIssuePropertyResponse> = {}): GetIssuePropertyResponse => ({
	key,
	value,
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
