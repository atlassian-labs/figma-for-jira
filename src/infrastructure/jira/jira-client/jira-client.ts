import axios, { AxiosHeaders, HttpStatusCode } from 'axios';

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

type SupportedHttpMethod = 'GET' | 'POST' | 'PUT';

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
		request: SubmitDesignsRequest,
		clientParams: JiraClientParams,
	): Promise<SubmitDesignsResponse> => {
		const url = new URL(`/rest/designs/1.0/bulk`, clientParams.baseUrl);

		const response = await axios.post<SubmitDesignsResponse>(
			url.toString(),
			request,
			{
				headers: new AxiosHeaders().setAuthorization(
					this.buildAuthorizationHeader(url, 'POST', clientParams),
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
	// TODO: Delete the method if not required by the `/associateEntity` flow.
	getIssue = async (
		issueIdOrKey: string,
		clientParams: JiraClientParams,
	): Promise<GetIssueResponse> => {
		const url = new URL(
			`/rest/agile/1.0/issue/${issueIdOrKey}`,
			clientParams.baseUrl,
		);

		const response = await axios.get<GetIssueResponse>(url.toString(), {
			headers: new AxiosHeaders().setAuthorization(
				this.buildAuthorizationHeader(url, 'GET', clientParams),
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
		clientParams: JiraClientParams,
	): Promise<GetIssuePropertyResponse> => {
		const url = new URL(
			`/rest/api/2/issue/${issueIdOrKey}/properties/${propertyKey}`,
			clientParams.baseUrl,
		);

		const response = await axios.get<GetIssuePropertyResponse>(url.toString(), {
			headers: new AxiosHeaders().setAuthorization(
				this.buildAuthorizationHeader(url, 'GET', clientParams),
			),
		});

		if (response.status === HttpStatusCode.NotFound.valueOf()) {
			throw new JiraClientNotFoundError(
				`Property ${propertyKey} does not exist.`,
			);
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
		clientParams: JiraClientParams,
	): Promise<number> => {
		const url = new URL(
			`/rest/api/2/issue/${issueIdOrKey}/properties/${propertyKey}`,
			clientParams.baseUrl,
		);

		const response = await axios.put(url.toString(), value, {
			headers: new AxiosHeaders()
				.setAuthorization(
					this.buildAuthorizationHeader(url, 'PUT', clientParams),
				)
				.setAccept('application/json')
				.setContentType('application/json'),
		});

		return response.status;
	};

	private buildAuthorizationHeader(
		url: URL,
		method: SupportedHttpMethod,
		{ connectAppKey, connectSharedSecret }: JiraClientParams,
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

export class JiraClientParams {
	constructor(
		readonly baseUrl: string,
		readonly connectAppKey: string,
		readonly connectSharedSecret: string,
	) {}

	static fromConnectInstallation({
		baseUrl,
		key,
		sharedSecret,
	}: ConnectInstallation) {
		return new JiraClientParams(baseUrl, key, sharedSecret);
	}
}

export const jiraClient = new JiraClient();
