import axios from 'axios';

import { JiraClientResponseValidationError } from './errors';
import { jiraClient } from './jira-client';
import * as jwtUtils from './jwt-utils';
import {
	generateGetIssueResponse,
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JIRA_CLIENT_PARAMS,
	MOCK_JWT_TOKEN,
} from './testing';

describe('JiraClient', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('submitDesigns', () => {
		it('should submit designs', async () => {
			const request = generateSubmitDesignsRequest();
			const response = generateSuccessfulSubmitDesignsResponse(
				request.designs[0].id,
			);
			jest.spyOn(jwtUtils, 'createJwtToken').mockReturnValue(MOCK_JWT_TOKEN);
			jest.spyOn(axios, 'post').mockResolvedValue({ data: response });

			const result = await jiraClient.submitDesigns(
				request,
				MOCK_JIRA_CLIENT_PARAMS,
			);

			expect(result).toBe(response);
			expect(axios.post).toHaveBeenCalledWith(
				`${MOCK_JIRA_CLIENT_PARAMS.baseUrl}/rest/designs/1.0/bulk`,
				request,
				{
					headers: {
						Authorization: `JWT ${MOCK_JWT_TOKEN}`,
					},
				},
			);
		});

		it('should thrown when response has invalid schema', async () => {
			const request = generateSubmitDesignsRequest();
			const unexpectedResponse = {
				...generateSuccessfulSubmitDesignsResponse(),
				acceptedEntities: null,
			};
			jest.spyOn(axios, 'post').mockResolvedValue({
				data: unexpectedResponse,
			});

			await expect(() =>
				jiraClient.submitDesigns(request, MOCK_JIRA_CLIENT_PARAMS),
			).rejects.toBeInstanceOf(JiraClientResponseValidationError);
		});
	});

	describe('getIssue', () => {
		it('should return issue', async () => {
			const issueKey = 'TEST-1';
			const response = generateGetIssueResponse({ key: issueKey });
			jest.spyOn(jwtUtils, 'createJwtToken').mockReturnValue(MOCK_JWT_TOKEN);
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: response,
			});

			const result = await jiraClient.getIssue(
				issueKey,
				MOCK_JIRA_CLIENT_PARAMS,
			);

			expect(result).toBe(response);
			expect(axios.get).toHaveBeenCalledWith(
				`${MOCK_JIRA_CLIENT_PARAMS.baseUrl}/rest/agile/1.0/issue/${issueKey}`,
				{
					headers: {
						Authorization: `JWT ${MOCK_JWT_TOKEN}`,
					},
				},
			);
		});

		it('should thrown when response has invalid schema', async () => {
			const issueKey = 'TEST-1';
			const unexpectedResponse = {
				...generateGetIssueResponse({ key: issueKey }),
				id: null,
			};
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: unexpectedResponse,
			});

			await expect(() =>
				jiraClient.getIssue(issueKey, MOCK_JIRA_CLIENT_PARAMS),
			).rejects.toBeInstanceOf(JiraClientResponseValidationError);
		});
	});
});
