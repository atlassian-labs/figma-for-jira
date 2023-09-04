import axios from 'axios';

import { jiraClient } from './jira-client';
import * as jwtUtils from './jwt-utils';
import {
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JIRA_CLIENT_PARAMS,
	MOCK_JWT_TOKEN,
} from './testing';

import {
	generateAtlassianDesign,
	generateJiraIssue,
} from '../../../domain/entities/testing';

describe('JiraClient', () => {
	describe('submitDesigns', () => {
		it('should submit designs', async () => {
			const atlassianDesign = generateAtlassianDesign();
			const request = {
				designs: [atlassianDesign],
			};
			const response = generateSuccessfulSubmitDesignsResponse(
				atlassianDesign.id,
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
			const atlassianDesign = generateAtlassianDesign();
			const request = {
				designs: [atlassianDesign],
			};
			const unexpectedResponse = {
				...generateSuccessfulSubmitDesignsResponse(atlassianDesign.id),
				acceptedEntities: null,
			};
			jest.spyOn(axios, 'post').mockResolvedValue({
				data: unexpectedResponse,
			});

			await expect(() =>
				jiraClient.submitDesigns(request, MOCK_JIRA_CLIENT_PARAMS),
			).rejects.toThrowError(
				`Unexpected response from /rest/designs/1.0/bulk.`,
			);
		});
	});

	describe('getIssue', () => {
		it('should return issue', async () => {
			const issueKey = 'TEST-1';
			const response = generateJiraIssue({ key: issueKey });
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
				...generateJiraIssue({ key: issueKey }),
				id: null,
			};
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: unexpectedResponse,
			});

			await expect(() =>
				jiraClient.getIssue(issueKey, MOCK_JIRA_CLIENT_PARAMS),
			).rejects.toThrowError(
				`Unexpected response from /rest/agile/1.0/issue/${issueKey}.`,
			);
		});
	});
});
