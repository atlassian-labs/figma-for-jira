import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../../common/duration';
import type { JiraClientParams } from '../jira-client';
import type { JwtTokenParams } from '../jwt-utils';
import type {
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../types';

export const MOCK_JIRA_CLIENT_PARAMS: JiraClientParams = {
	baseUrl: 'https://test.atlassian.com',
	connectAppKey: uuidv4(),
	connectSharedSecret: uuidv4(),
};

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

export const generateSubmitDesignsRequest = ({
	id = uuidv4(),
	displayName = `Design ${uuidv4()}`,
	url = `https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/${displayName}?type=design&node-id=0-1&mode=design`,
	liveEmbedUrl = `https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/${displayName}?type=design&node-id=0-1&mode=design`,
	status = 'UNKNOWN',
	type = 'FILE',
	lastUpdated = new Date().toISOString(),
	updateSequenceNumber = Date.now(),
	addAssociations = [],
	removeAssociations = [],
} = {}): SubmitDesignsRequest => ({
	designs: [
		{
			id,
			displayName,
			url,
			liveEmbedUrl,
			status,
			type,
			lastUpdated,
			updateSequenceNumber,
			addAssociations,
			removeAssociations,
		},
	],
});

export const generateSuccessfulSubmitDesignsResponse = (
	designId = uuidv4(),
): SubmitDesignsResponse => ({
	acceptedEntities: [{ designId }],
	rejectedEntities: [],
});

export const generateFailedSubmitDesignsResponse = (
	designId = uuidv4(),
): SubmitDesignsResponse => ({
	acceptedEntities: [],
	rejectedEntities: [
		{
			key: { designId },
			errors: [
				{
					message: 'Failure',
				},
			],
		},
	],
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
	id = uuidv4(),
	key = uuidv4(),
	self = 'https://myjirainstance.atlassian.net/browse/FIG-1',
	fields = {
		summary: `Issue ${uuidv4()}`,
	},
} = {}): GetIssueResponse => ({
	id,
	key,
	self,
	fields,
});
