import axios, { AxiosHeaders, HttpStatusCode } from 'axios';

import { jiraClient } from './jira-client';
import { createJwtToken } from './jwt-utils';
import {
	generateCheckPermissionsRequest,
	generateCheckPermissionsResponse,
	generateGetIssueResponse,
	generateSubmitDesignsRequest,
	generateSuccessfulSubmitDesignsResponse,
	MOCK_JWT_TOKEN,
} from './testing';
import type {
	CheckPermissionsRequest,
	CheckPermissionsResponse,
} from './types';

import { SchemaValidationError } from '../../../common/schema-validation';
import type { ConnectInstallation } from '../../../domain/entities';
import { generateConnectInstallation } from '../../../domain/entities/testing';

jest.mock('./jwt-utils');

describe('JiraClient', () => {
	let connectInstallation: ConnectInstallation;

	const defaultExpectedRequestHeaders = () => ({
		headers: new AxiosHeaders().setAuthorization(`JWT ${MOCK_JWT_TOKEN}`),
	});

	beforeEach(() => {
		jest.mocked(createJwtToken).mockReturnValue(MOCK_JWT_TOKEN);
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
				`${connectInstallation.baseUrl}/rest/api/3/issue/${issueKey}`,
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
				.setContentType('application/json');

			expect(axios.put).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/atlassian-connect/1/addons/${connectInstallation.key}/properties/${propertyKey}`,
				JSON.stringify('some value'),
				{ headers },
			);
		});
	});

	describe('deleteAppProperty', () => {
		const propertyKey = 'property-key';
		it('should delete app property', async () => {
			jest.spyOn(axios, 'delete').mockResolvedValue({
				status: HttpStatusCode.NoContent,
			});

			await jiraClient.deleteAppProperty(propertyKey, connectInstallation);

			expect(axios.delete).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/atlassian-connect/1/addons/${connectInstallation.key}/properties/${propertyKey}`,
				defaultExpectedRequestHeaders(),
			);
		});
	});

	describe('checkPermissions', () => {
		it('should check permissions', async () => {
			const request: CheckPermissionsRequest =
				generateCheckPermissionsRequest();
			const response: CheckPermissionsResponse =
				generateCheckPermissionsResponse();
			jest.spyOn(axios, 'post').mockResolvedValue({
				status: HttpStatusCode.Ok,
				data: response,
			});

			const result = await jiraClient.checkPermissions(
				request,
				connectInstallation,
			);

			expect(result).toBe(response);
			expect(axios.post).toHaveBeenCalledWith(
				`${connectInstallation.baseUrl}/rest/api/3/permissions/check`,
				request,
				defaultExpectedRequestHeaders(),
			);
		});
	});
});
