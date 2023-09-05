import type { RawAxiosRequestHeaders } from 'axios';
import axios from 'axios';

import { createJwtToken } from './jwt-utils';
import {
	GET_ISSUE_RESPONSE_SCHEMA,
	SUBMIT_DESIGNS_RESPONSE_SCHEMA,
} from './schemas';
import type {
	GetIssueResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from './types';

import { Duration } from '../../../common/duration';
import { getAjvSchema } from '../../ajv';
import { getLogger } from '../../logger';

const TOKEN_EXPIRES_IN = Duration.ofMinutes(3);

export type JiraClientParams = {
	readonly baseUrl: string;
	readonly connectAppKey: string;
	readonly connectSharedSecret: string;
};

/**
 * A Jira API client.
 *
 * @see https://developer.atlassian.com/cloud/jira/software/rest/intro/#introduction
 */
export class JiraClient {
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
		{ baseUrl, connectAppKey, connectSharedSecret }: JiraClientParams,
	): Promise<SubmitDesignsResponse> => {
		const url = new URL(`/rest/designs/1.0/bulk`, baseUrl);
		const jwtToken = createJwtToken({
			request: {
				method: 'POST',
				pathname: url.pathname,
			},
			expiresIn: TOKEN_EXPIRES_IN,
			connectAppKey,
			connectSharedSecret,
		});

		const response = await axios.post<SubmitDesignsResponse>(
			url.toString(),
			payload,
			{
				headers: {
					...this.buildAuthorizationHeader(jwtToken),
				},
			},
		);

		const validate = getAjvSchema(SUBMIT_DESIGNS_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			const error = new Error(`Unexpected response from ${url.pathname}.`);
			getLogger().error(
				error,
				`Unexpected response from %s: %o`,
				url.toString(),
				validate.errors,
			);
			throw error;
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
		{ baseUrl, connectAppKey, connectSharedSecret }: JiraClientParams,
	): Promise<GetIssueResponse> => {
		const url = new URL(`/rest/agile/1.0/issue/${issueIdOrKey}`, baseUrl);
		const jwtToken = createJwtToken({
			request: {
				method: 'GET',
				pathname: url.pathname,
			},
			expiresIn: TOKEN_EXPIRES_IN,
			connectAppKey,
			connectSharedSecret,
		});

		const response = await axios.get<GetIssueResponse>(url.toString(), {
			headers: {
				...this.buildAuthorizationHeader(jwtToken),
			},
		});

		const validate = getAjvSchema(GET_ISSUE_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			const error = new Error(`Unexpected response from ${url.pathname}.`);
			getLogger().error(
				error,
				`Unexpected response from %s: %o`,
				url.toString(),
				validate.errors,
			);
			throw error;
		}

		return response.data;
	};

	private buildAuthorizationHeader(jwtToken: string): RawAxiosRequestHeaders {
		return {
			Authorization: `JWT ${jwtToken}`,
		};
	}
}

export const jiraClient = new JiraClient();
