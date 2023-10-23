import type { AxiosResponse } from 'axios';
import axios, { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios';

import { jiraClient } from './jira-client';
import { createJwtToken } from './jwt-utils';
import {
	generateGetIssuePropertyResponse,
	generateGetIssueResponse,
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JWT_TOKEN,
} from './testing';

import { NotFoundOperationError } from '../../../common/errors';
import type { ConnectInstallation } from '../../../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
} from '../../../domain/entities/testing';
import { SchemaValidationError } from '../../ajv';

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
			const response = generateSuccessfulSubmitDesignsResponse([
				request.designs[0].id,
			]);
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
			).rejects.toThrowError(SchemaValidationError);
		});
	});

	describe('deleteDesign', () => {
		it('should delete design', async () => {
			const designId = generateFigmaDesignIdentifier();
			jest.spyOn(axios, 'delete').mockResolvedValue(undefined);

			const result = await jiraClient.deleteDesign(
				designId,
				connectInstallation,
			);

			expect(result).toBe(designId);
			expect(axios.delete).toHaveBeenCalledWith(
				`${
					connectInstallation.baseUrl
				}/rest/designs/1.0/design/${designId.toAtlassianDesignId()}`,
				defaultExpectedRequestHeaders(),
			);
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
			).rejects.toThrowError(SchemaValidationError);
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

			const headers =
				defaultExpectedRequestHeaders().headers.setAccept('application/json');

			expect(axios.get).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/api/2/issue/TEST-1/properties/${propertyKey}`,
				{ headers },
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
			).rejects.toThrowError(SchemaValidationError);
		});

		it('should throw a JiraClientNotFound exception when response status is 404', async () => {
			jest
				.spyOn(axios, 'get')
				.mockRejectedValue(
					new AxiosError(
						'Not found.',
						HttpStatusCode.NotFound.toString(),
						undefined,
						undefined,
						{ status: HttpStatusCode.NotFound } as AxiosResponse,
					),
				);

			await expect(() =>
				jiraClient.getIssueProperty(issueId, propertyKey, connectInstallation),
			).rejects.toThrowError(NotFoundOperationError);
		});
	});

	describe('setIssueProperty', () => {
		const issueId = 'TEST-1';
		const propertyKey = 'property-key';
		it("should set an issue's properties", async () => {
			jest.spyOn(axios, 'put').mockResolvedValue({
				status: HttpStatusCode.Ok,
			});

			await jiraClient.setIssueProperty(
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
		});
	});

	describe('deleteIssueProperty', () => {
		const issueId = 'TEST-1';
		const propertyKey = 'property-key';
		it('should delete the issue property', async () => {
			jest.spyOn(axios, 'delete').mockResolvedValue({
				status: HttpStatusCode.NoContent,
			});

			await jiraClient.deleteIssueProperty(
				issueId,
				propertyKey,
				connectInstallation,
			);

			expect(axios.delete).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/api/2/issue/${issueId}/properties/${propertyKey}`,
				defaultExpectedRequestHeaders(),
			);
		});

		it('should throw a JiraClientNotFound exception when response status is 404', async () => {
			jest
				.spyOn(axios, 'delete')
				.mockRejectedValue(
					new AxiosError(
						'Not found.',
						HttpStatusCode.NotFound.toString(),
						undefined,
						undefined,
						{ status: HttpStatusCode.NotFound } as AxiosResponse,
					),
				);

			await expect(() =>
				jiraClient.deleteIssueProperty(
					issueId,
					propertyKey,
					connectInstallation,
				),
			).rejects.toThrowError(NotFoundOperationError);
		});
	});

	describe('setAppProperty', () => {
		const propertyKey = 'property-key';
		it('should set app property', async () => {
			jest.spyOn(axios, 'put').mockResolvedValue({
				status: HttpStatusCode.Ok,
			});

			await jiraClient.setAppProperty(
				propertyKey,
				'some value',
				connectInstallation,
			);

			const headers = defaultExpectedRequestHeaders()
				.headers.setAccept('application/json')
				.setContentType('text/plain');

			expect(axios.put).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/atlassian-connect/1/addons/${connectInstallation.key}/properties/${propertyKey}`,
				'some value',
				{ headers },
			);
		});
	});
});
