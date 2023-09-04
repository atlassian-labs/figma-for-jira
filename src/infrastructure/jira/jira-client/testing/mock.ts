import { v4 as uuidv4 } from 'uuid';

import { Duration } from '../../../../common/duration';
import type { JiraClientParams } from '../jira-client';
import type { JwtTokenParams } from '../jwt-utils';
import type { SubmitDesignsResponse } from '../types';

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

export const generateSuccessfulSubmitDesignsResponse = (
	designId: string,
): SubmitDesignsResponse => ({
	acceptedEntities: [{ designId }],
	rejectedEntities: [],
});

export const generateFailedSubmitDesignsResponse = (
	designId: string,
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