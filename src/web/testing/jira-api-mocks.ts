import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';

import type {
	CheckPermissionsRequest,
	CheckPermissionsResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../../infrastructure/jira/jira-client';
import {
	generateCheckPermissionsResponse,
	generateGetIssueResponse,
	generateSuccessfulSubmitDesignsResponse,
} from '../../infrastructure/jira/jira-client/testing';

export const mockJiraSubmitDesignsEndpoint = ({
	baseUrl,
	request,
	response = generateSuccessfulSubmitDesignsResponse(),
	status = HttpStatusCode.Ok,
}: {
	baseUrl: URL | string;
	request?: SubmitDesignsRequest | RequestBodyMatcher;
	response?: SubmitDesignsResponse;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString())
		.post('/rest/designs/1.0/bulk', request)
		.reply(status, response);
};

export const mockJiraGetIssueEndpoint = ({
	baseUrl,
	issueId,
	status = HttpStatusCode.Ok,
	response = generateGetIssueResponse({ id: issueId }),
}: {
	baseUrl: URL | string;
	issueId: string;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(baseUrl.toString())
		.get(`/rest/api/3/issue/${issueId}`)
		.reply(status, response);
};

export const mockJiraSetAppPropertyEndpoint = ({
	baseUrl,
	appKey,
	propertyKey,
	request,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: URL | string;
	appKey: string;
	propertyKey: string;
	request: RequestBodyMatcher;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString())
		.put(
			`/rest/atlassian-connect/1/addons/${appKey}/properties/${propertyKey}`,
			request,
		)
		.reply(status);
};

export const mockJiraDeleteAppPropertyEndpoint = ({
	baseUrl,
	appKey,
	propertyKey,
	status = HttpStatusCode.NoContent,
}: {
	baseUrl: URL | string;
	appKey: string;
	propertyKey: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString())
		.delete(
			`/rest/atlassian-connect/1/addons/${appKey}/properties/${propertyKey}`,
		)
		.reply(status);
};

export const mockJiraCheckPermissionsEndpoint = ({
	baseUrl,
	request,
	status = HttpStatusCode.Ok,
	response = generateCheckPermissionsResponse(),
}: {
	baseUrl: URL | string;
	request: CheckPermissionsRequest;
	status?: HttpStatusCode;
	response?: CheckPermissionsResponse;
}) => {
	nock(baseUrl.toString())
		.post(`/rest/api/3/permissions/check`, request)
		.reply(status, response);
};
