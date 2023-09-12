import type { AxiosResponse, Method } from 'axios';
import axios, { AxiosHeaders, HttpStatusCode, isAxiosError } from 'axios';

import {
	JiraClientNotFoundError,
	JiraClientResponseValidationError,
} from './errors';
import { createJwtToken } from './jwt-utils';
import {
	GET_ISSUE_PROPERTY_RESPONSE_SCHEMA,
	GET_ISSUE_RESPONSE_SCHEMA,
	SUBMIT_DESIGNS_RESPONSE_SCHEMA,
} from './schemas';
import type {
	GetIssuePropertyResponse,
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from './types';

import { Duration } from '../../../common/duration';
import type { ConnectInstallation } from '../../../domain/entities';
import { getAjvSchema } from '../../ajv';

const TOKEN_EXPIRES_IN = Duration.ofMinutes(3);
const ISSUE_PROPERTY_BASE_URI = '/rest/api/2/issue';

/**
 * A Jira API client.
 *
 * @see https://developer.atlassian.com/cloud/jira/software/rest/intro/#introduction
 */
class JiraClient {
	// TODO: This method has not been tested due to the issue on the Jira side. Therefore, issues in the contract
	// 	definition and implementation are very likely. Test the method and address found issues.
	/**
	 * Insert/update design data.
	 *
	 * Designs are identified by `designId`, and existing design data for the same design will be replaced if it exists
	 * and the `updateSequenceNumber` of the existing data is less than the incoming data.
	 *
	 * Submissions are performed asynchronously. Submitted data will eventually be available in Jira; most updates are
	 * available within a short period of time, but may take some time during peak load and/or maintenance times.
	 *
	 * // TODO: Verify that link is correct when the documentation is published.
	 * @see https://developer.atlassian.com/cloud/jira/software/rest/api-group-design/#api-group-design
	 */
	submitDesigns = async (
		payload: SubmitDesignsRequest,
		connectInstallation: ConnectInstallation,
	): Promise<SubmitDesignsResponse> => {
		const url = new URL(`/rest/designs/1.0/bulk`, connectInstallation.baseUrl);

		const response = await axios.post<SubmitDesignsResponse>(
			url.toString(),
			payload,
			{
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader(url, 'POST', connectInstallation),
				),
			},
		);

		const validate = getAjvSchema(SUBMIT_DESIGNS_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			throw new JiraClientResponseValidationError(url, validate.errors);
		}

		return response.data;
	};

	/**
	 * Returns a single issue, for a given issue ID or issue key.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/software/rest/api-group-issue/#api-rest-agile-1-0-issue-issueidorkey-get
	 */
	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<GetIssueResponse> => {
		const url = new URL(
			`/rest/agile/1.0/issue/${issueIdOrKey}`,
			connectInstallation.baseUrl,
		);

		const response = await axios.get<GetIssueResponse>(url.toString(), {
			headers: new AxiosHeaders().setAuthorization(
				this.buildAuthorizationHeader(url, 'GET', connectInstallation),
			),
		});

		const validate = getAjvSchema(GET_ISSUE_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			throw new JiraClientResponseValidationError(url, validate.errors);
		}

		return response.data;
	};

	/**
	 * Returns the key and value of an issue's property
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-get
	 */
	getIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<GetIssuePropertyResponse> => {
		const url = new URL(
			`${ISSUE_PROPERTY_BASE_URI}/${issueIdOrKey}/properties/${propertyKey}`,
			connectInstallation.baseUrl,
		);
		let response: AxiosResponse<GetIssuePropertyResponse>;
		try {
			response = await axios.get<GetIssuePropertyResponse>(url.toString(), {
				headers: new AxiosHeaders()
					.setAuthorization(
						this.buildAuthorizationHeader(url, 'GET', connectInstallation),
					)
					.setAccept('application/json'),
			});
		} catch (error) {
			if (
				isAxiosError(error) &&
				error.response?.status === HttpStatusCode.NotFound
			) {
				throw new JiraClientNotFoundError();
			} else {
				throw error;
			}
		}

		const validate = getAjvSchema(GET_ISSUE_PROPERTY_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			throw new JiraClientResponseValidationError(url, validate.errors);
		}

		return response.data;
	};

	/**
	 * Sets the value of an issue's property. Use this resource to store custom data against an issue.
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-put
	 */
	setIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		value: unknown,
		connectInstallation: ConnectInstallation,
	): Promise<number> => {
		const url = new URL(
			`${ISSUE_PROPERTY_BASE_URI}/${issueIdOrKey}/properties/${propertyKey}`,
			connectInstallation.baseUrl,
		);

		const response = await axios.put(url.toString(), value, {
			headers: new AxiosHeaders()
				.setAuthorization(
					this.buildAuthorizationHeader(url, 'PUT', connectInstallation),
				)
				.setAccept('application/json')
				.setContentType('application/json'),
		});

		return response.status;
	};

	/**
	 * Deletes an issue's property
	 *
	 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-properties/#api-rest-api-2-issue-issueidorkey-properties-propertykey-delete
	 */
	deleteIssueProperty = async (
		issueIdOrKey: string,
		propertyKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const url = new URL(
			`${ISSUE_PROPERTY_BASE_URI}/${issueIdOrKey}/properties/${propertyKey}`,
			connectInstallation.baseUrl,
		);

		try {
			await axios.delete(url.toString(), {
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader(url, 'DELETE', connectInstallation),
				),
			});
		} catch (error) {
			if (
				isAxiosError(error) &&
				error.response?.status === HttpStatusCode.NotFound
			) {
				throw new JiraClientNotFoundError();
			} else {
				throw error;
			}
		}
	};

	private buildAuthorizationHeader(
		url: URL,
		method: Method,
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
