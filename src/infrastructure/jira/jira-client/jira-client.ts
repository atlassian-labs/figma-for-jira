import type { Method } from 'axios';
import axios, { AxiosHeaders } from 'axios';

import { createJwtToken } from './jwt-utils';
import {
	CHECK_PERMISSIONS_RESPONSE_SCHEMA,
	GET_ISSUE_PROPERTY_RESPONSE_SCHEMA,
	GET_ISSUE_RESPONSE_SCHEMA,
	SUBMIT_DESIGNS_RESPONSE_SCHEMA,
} from './schemas';
import type {
	CheckPermissionsRequest,
	CheckPermissionsResponse,
	GetIssuePropertyResponse,
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from './types';

import { Duration } from '../../../common/duration';
import { assertSchema } from '../../../common/schema-validation';
import type { ConnectInstallation } from '../../../domain/entities';
import { withAxiosErrorTranslation } from '../../axios-utils';

const TOKEN_EXPIRES_IN = Duration.ofMinutes(3);

/**
 * A Jira API client.
 *
 * @see https://developer.atlassian.com/cloud/jira/software/rest/intro/#introduction
 */
class JiraClient {
	/**
	 * Insert/update design data.
	 *
	 * Designs are identified by `designId`, and existing design data for the same design will be replaced if it exists
	 * and the `updateSequenceNumber` of the existing data is less than the incoming data.
	 *
	 * Submissions are performed asynchronously. Submitted data will eventually be available in Jira; most updates are
	 * available within a short period of time, but may take some time during peak load and/or maintenance times.
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	submitDesigns = async (
		payload: SubmitDesignsRequest,
		connectInstallation: ConnectInstallation,
	): Promise<SubmitDesignsResponse> => {
		const context = {
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				'/rest/designs/1.0/bulk',
				connectInstallation.baseUrl,
			);

			const response = await axios.post<unknown>(url.toString(), payload, {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader('POST', url, connectInstallation),
				),
			});

			assertSchema(response.data, SUBMIT_DESIGNS_RESPONSE_SCHEMA);

			return response.data;
		}, context);
	};

	/**
	 * Returns a single issue, for a given issue ID or issue key.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/software/rest/api-group-issue/#api-rest-agile-1-0-issue-issueidorkey-get
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<GetIssueResponse> => {
		const context = {
			issueIdOrKey,
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}`,
				connectInstallation.baseUrl,
			);

			const response = await axios.get<unknown>(url.toString(), {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader('GET', url, connectInstallation),
				),
			});

			assertSchema(response.data, GET_ISSUE_RESPONSE_SCHEMA);

			return response.data;
		}, context);
	};

	/**
	 * Returns the key and value of an issue's property
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-get
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	getIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<GetIssuePropertyResponse> => {
		const context = {
			issueIdOrKey,
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/api/2/issue/${encodeURIComponent(
					issueIdOrKey,
				)}/properties/${encodeURIComponent(propertyKey)}`,
				connectInstallation.baseUrl,
			);

			const response = await axios.get<unknown>(url.toString(), {
				headers: new AxiosHeaders()
					.setAuthorization(
						this.buildAuthorizationHeader('GET', url, connectInstallation),
					)
					.setAccept('application/json'),
			});

			assertSchema<GetIssuePropertyResponse>(
				response.data,
				GET_ISSUE_PROPERTY_RESPONSE_SCHEMA,
			);

			return response.data;
		}, context);
	};

	/**
	 * Sets the value of an issue's property. Use this resource to store custom data against an issue.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-put
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	setIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		value: unknown,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const context = {
			issueIdOrKey,
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/api/2/issue/${encodeURIComponent(
					issueIdOrKey,
				)}/properties/${encodeURIComponent(propertyKey)}`,
				connectInstallation.baseUrl,
			);

			await axios.put<unknown>(url.toString(), JSON.stringify(value), {
				headers: new AxiosHeaders()
					.setAuthorization(
						this.buildAuthorizationHeader('PUT', url, connectInstallation),
					)
					.setAccept('application/json')
					.setContentType('application/json'),
			});
		}, context);
	};

	/**
	 * Deletes an issue's property
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-delete
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	deleteIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const context = {
			issueIdOrKey,
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/api/2/issue/${encodeURIComponent(
					issueIdOrKey,
				)}/properties/${encodeURIComponent(propertyKey)}`,
				connectInstallation.baseUrl,
			);

			await axios.delete<unknown>(url.toString(), {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader('DELETE', url, connectInstallation),
				),
			});
		}, context);
	};

	/**
	 * Sets a connect app property.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-app-properties/#api-rest-atlassian-connect-1-addons-addonkey-properties-propertykey-put
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	setAppProperty = async (
		propertyKey: string,
		value: unknown,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const context = {
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/atlassian-connect/1/addons/${encodeURIComponent(
					connectInstallation.key,
				)}/properties/${encodeURIComponent(propertyKey)}`,
				connectInstallation.baseUrl,
			);

			await axios.put<unknown>(url.toString(), JSON.stringify(value), {
				headers: new AxiosHeaders()
					.setAuthorization(
						this.buildAuthorizationHeader('PUT', url, connectInstallation),
					)
					.setAccept('application/json')
					.setContentType('application/json'),
			});
		}, context);
	};

	/**
	 * Deletes a connect app property.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-app-properties/#api-rest-atlassian-connect-1-addons-addonkey-properties-propertykey-delete
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	deleteAppProperty = async (
		propertyKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const context = {
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/atlassian-connect/1/addons/${encodeURIComponent(
					connectInstallation.key,
				)}/properties/${encodeURIComponent(propertyKey)}`,
				connectInstallation.baseUrl,
			);

			await axios.delete(url.toString(), {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader('DELETE', url, connectInstallation),
				),
			});
		}, context);
	};

	/**
	 * Returns a list of requested global and project permissions.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-permissions/#api-rest-api-3-permissions-check-post
	 *
	 * @throws {HttpClientError} An error associated with specific HTTP response status codes.
	 */
	checkPermissions = async (
		payload: CheckPermissionsRequest,
		connectInstallation: ConnectInstallation,
	): Promise<CheckPermissionsResponse> => {
		const context = {
			baseUrl: connectInstallation.baseUrl,
			clientKey: connectInstallation.clientKey,
		};
		return withAxiosErrorTranslation(async () => {
			const url = new URL(
				`/rest/api/3/permissions/check`,
				connectInstallation.baseUrl,
			);

			const response = await axios.post<unknown>(url.toString(), payload, {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader('POST', url, connectInstallation),
				),
			});

			assertSchema(response.data, CHECK_PERMISSIONS_RESPONSE_SCHEMA);

			return response.data;
		}, context);
	};

	private buildAuthorizationHeader(
		method: Method,
		url: URL,
		{
			key: connectAppKey,
			sharedSecret: connectSharedSecret,
		}: ConnectInstallation,
	) {
		const jwtToken = createJwtToken({
			request: {
				method,
				pathname: url.pathname,
			},
			expiresIn: TOKEN_EXPIRES_IN,
			connectAppKey,
			connectSharedSecret,
		});
		return `JWT ${jwtToken}`;
	}
}

export const jiraClient = new JiraClient();
