import axios, { AxiosHeaders, HttpStatusCode } from 'axios';

import { JiraClientResponseValidationError } from './errors';
import { jiraClient } from './jira-client';
import { createJwtToken } from './jwt-utils';
import {
	generateGetIssuePropertyResponse,
	generateGetIssueResponse,
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JWT_TOKEN,
} from './testing';

import type { ConnectInstallation } from '../../../domain/entities';
import { generateConnectInstallation } from '../../../domain/entities/testing';

jest.mock('./jwt-utils');

describe('JiraClient', () => {
	let connectInstallation: ConnectInstallation;
	const createJwtTokenMock = jest.mocked(createJwtToken);
	createJwtTokenMock.mockReturnValue(MOCK_JWT_TOKEN);

	const defaultExpectedRequestHeaders = () => ({
		headers: new AxiosHeaders().setAuthorization(`JWT ${MOCK_JWT_TOKEN}`),
	});

	beforeEach(() => {
		connectInstallation = generateConnectInstallation();
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
				connectInstallation,
			);

			expect(result).toBe(response);
			expect(axios.post).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/designs/1.0/bulk`,
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
				jiraClient.submitDesigns(request, connectInstallation),
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

			const result = await jiraClient.getIssue(issueKey, connectInstallation);

			expect(result).toBe(response);
			expect(axios.get).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/agile/1.0/issue/${issueKey}`,
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
				jiraClient.getIssue(issueKey, connectInstallation),
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
				connectInstallation,
			);

			expect(axios.get).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/api/2/issue/TEST-1/properties/${propertyKey}`,
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
				jiraClient.getIssueProperty(issueId, propertyKey, connectInstallation),
			).rejects.toThrowError(JiraClientResponseValidationError);
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
				connectInstallation,
			);

			const headers = defaultExpectedRequestHeaders()
				.headers.setAccept('application/json')
				.setContentType('application/json');

			expect(axios.put).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/api/2/issue/${issueId}/properties/${propertyKey}`,
				'some value',
				{ headers },
			);
			expect(response).toBe(HttpStatusCode.Ok);
		});
	});
});
