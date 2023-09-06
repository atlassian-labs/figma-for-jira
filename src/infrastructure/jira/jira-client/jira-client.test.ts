import axios, { AxiosHeaders, HttpStatusCode } from 'axios';

import {
	JiraClientNotFoundError,
	JiraClientResponseValidationError,
} from './errors';
import { jiraClient } from './jira-client';
import { createJwtToken } from './jwt-utils';
import {
	generateGetIssuePropertyResponse,
	generateGetIssueResponse,
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JIRA_CLIENT_PARAMS,
	MOCK_JWT_TOKEN,
} from './testing';

jest.mock('./jwt-utils');

describe('JiraClient', () => {
	const createJwtTokenMock = jest.mocked(createJwtToken);
	createJwtTokenMock.mockReturnValue(MOCK_JWT_TOKEN);

	const defaultExpectedRequestHeaders = () => ({
		headers: new AxiosHeaders().setAuthorization(`JWT ${MOCK_JWT_TOKEN}`),
	});

	describe('submitDesigns', () => {
		it('should submit designs', async () => {
			const request = generateSubmitDesignsRequest();
			const response = generateSuccessfulSubmitDesignsResponse(
				request.designs[0].id,
			);
			jest.spyOn(axios, 'post').mockResolvedValue({ data: response });

			const result = await jiraClient.submitDesigns(
				request,
				MOCK_JIRA_CLIENT_PARAMS,
			);

			expect(result).toBe(response);
			expect(axios.post).toHaveBeenCalledWith(
				`${MOCK_JIRA_CLIENT_PARAMS.baseUrl}/rest/designs/1.0/bulk`,
				request,
				defaultExpectedRequestHeaders(),
			);
		});

		it('should throw when response has invalid schema', async () => {
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
			).rejects.toThrowError(JiraClientResponseValidationError);
		});
	});

	describe('getIssue', () => {
		const issueKey = 'TEST-1';
		it('should return issue', async () => {
			const response = generateGetIssueResponse({ key: issueKey });
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
				defaultExpectedRequestHeaders(),
			);
		});

		it('should throw when response has invalid schema', async () => {
			const unexpectedResponse = {
				...generateGetIssueResponse({ key: issueKey }),
				id: null,
			};
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: unexpectedResponse,
			});

			await expect(() =>
				jiraClient.getIssue(issueKey, MOCK_JIRA_CLIENT_PARAMS),
			).rejects.toThrowError(JiraClientResponseValidationError);
		});
	});

	describe('getIssueProperty', () => {
		const issueId = 'TEST-1';
		const propertyKey = 'property-key';
		it("should return an issue's properties", async () => {
			const response = generateGetIssuePropertyResponse({ key: propertyKey });
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: response,
			});

			const result = await jiraClient.getIssueProperty(
				issueId,
				propertyKey,
				MOCK_JIRA_CLIENT_PARAMS,
			);

			expect(axios.get).toHaveBeenCalledWith(
				`${MOCK_JIRA_CLIENT_PARAMS.baseUrl}/rest/api/2/issue/TEST-1/properties/${propertyKey}`,
				defaultExpectedRequestHeaders(),
			);
			expect(result).toEqual(response);
		});

		it('should throw when a response has invalid schema', async () => {
			const invalidResponse = {
				...generateGetIssuePropertyResponse(),
				key: null,
			};
			jest.spyOn(axios, 'get').mockResolvedValue({
				data: invalidResponse,
			});

			await expect(() =>
				jiraClient.getIssueProperty(
					issueId,
					propertyKey,
					MOCK_JIRA_CLIENT_PARAMS,
				),
			).rejects.toThrowError(JiraClientResponseValidationError);
		});

		it('should throw a JiraClientNotFoundError when an issue property is not found', async () => {
			jest.spyOn(axios, 'get').mockResolvedValue({
				status: 404,
			});

			await expect(() =>
				jiraClient.getIssueProperty(
					issueId,
					propertyKey,
					MOCK_JIRA_CLIENT_PARAMS,
				),
			).rejects.toThrowError(JiraClientNotFoundError);
		});
	});

	describe('setIssueProperty', () => {
		const issueId = 'TEST-1';
		const propertyKey = 'property-key';
		it("should set an issue's properties and respond with a status code", async () => {
			jest.spyOn(axios, 'put').mockResolvedValue({
				status: HttpStatusCode.Ok,
			});

			const response = await jiraClient.setIssueProperty(
				issueId,
				propertyKey,
				'some value',
				MOCK_JIRA_CLIENT_PARAMS,
			);

			const headers = defaultExpectedRequestHeaders()
				.headers.setAccept('application/json')
				.setContentType('application/json');

			expect(axios.put).toHaveBeenCalledWith(
				`${MOCK_JIRA_CLIENT_PARAMS.baseUrl}/rest/api/2/issue/${issueId}/properties/${propertyKey}`,
				'some value',
				{ headers },
			);
			expect(response).toBe(HttpStatusCode.Ok);
		});
	});
});
