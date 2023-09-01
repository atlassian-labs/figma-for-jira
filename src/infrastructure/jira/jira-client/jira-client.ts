import Ajv from 'ajv';
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
 * // TODO: Replace a link with a link to Design-related API.
 * @see https://developer.atlassian.com/cloud/jira/software/rest/intro/#introduction
 */
export class JiraClient {
	private readonly ajv = new Ajv();

	submitDesigns = async (
		request: SubmitDesignsRequest,
		clientParams: JiraClientParams,
	): Promise<SubmitDesignsResponse> => {
		const url = new URL(`/rest/designs/1.0/bulk`, clientParams.baseUrl);
		const jwtToken = createJwtToken({
			request: {
				method: 'POST',
				pathname: url.pathname,
			},
			expiresIn: TOKEN_EXPIRES_IN,
			connectAppKey: clientParams.connectAppKey,
			connectSharedSecret: clientParams.connectSharedSecret,
		});

		const response = await axios.post<SubmitDesignsResponse>(
			url.toString(),
			request,
			{
				headers: {
					Authorization: `JWT ${jwtToken}`,
				},
			},
		);

		const validate = this.ajv.compile(SUBMIT_DESIGNS_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			getLogger().error(
				validate.errors,
				`Unexpected response from ${url.toString()}`,
			);
			throw new Error(`Unexpected response from ${url.pathname}.`);
		}

		return response.data;
	};

	// TODO: Delete the method if not required by the `/associateEntity` flow.
	getIssue = async (
		issueIdOrKey: string,
		clientParams: JiraClientParams,
	): Promise<GetIssueResponse> => {
		const url = new URL(
			`/rest/agile/1.0/issue/${issueIdOrKey}`,
			clientParams.baseUrl,
		);
		const jwtToken = createJwtToken({
			request: {
				method: 'GET',
				pathname: url.pathname,
			},
			expiresIn: TOKEN_EXPIRES_IN,
			connectAppKey: clientParams.connectAppKey,
			connectSharedSecret: clientParams.connectSharedSecret,
		});

		const response = await axios.get<GetIssueResponse>(url.toString(), {
			headers: {
				Authorization: `JWT ${jwtToken}`,
			},
		});

		const validate = this.ajv.compile(GET_ISSUE_RESPONSE_SCHEMA);

		if (!validate(response.data)) {
			getLogger().error(
				validate.errors,
				`Unexpected response from ${url.toString()}`,
			);
			throw new Error(`Unexpected response from ${url.pathname}.`);
		}

		return response.data;
	};
}

export const jiraClient = new JiraClient();
