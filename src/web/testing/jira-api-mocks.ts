import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';

import { generateJiraIssueId } from '../../domain/entities/testing';
import type {
	GetIssuePropertyResponse,
	SubmitDesignsRequest,
	SubmitDesignsResponse,
} from '../../infrastructure/jira/jira-client';
import {
	generateGetIssuePropertyResponse,
	generateGetIssueResponse,
	generateSuccessfulSubmitDesignsResponse,
} from '../../infrastructure/jira/jira-client/testing';

export const mockSubmitDesignsEndpoint = ({
	baseUrl,
	request,
	response = generateSuccessfulSubmitDesignsResponse(),
	success = true,
}: {
	baseUrl: string;
	request?: SubmitDesignsRequest;
	response?: SubmitDesignsResponse;
	success?: boolean;
}) => {
	nock(baseUrl)
		.post('/rest/designs/1.0/bulk', request)
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			response,
		);
};

export const mockGetIssueEndpoint = ({
	baseUrl,
	issueId,
	status = HttpStatusCode.Ok,
	response = generateGetIssueResponse({ id: issueId }),
}: {
	baseUrl: string;
	issueId: string;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(baseUrl).get(`/rest/agile/1.0/issue/${issueId}`).reply(status, response);
};

export const mockGetIssuePropertyEndpoint = ({
	baseUrl,
	issueId = generateJiraIssueId(),
	propertyKey = '',
	status = HttpStatusCode.Ok,
	response = generateGetIssuePropertyResponse(),
}: {
	baseUrl: string;
	issueId: string;
	propertyKey: string;
	status?: HttpStatusCode;
	response?: GetIssuePropertyResponse;
}) => {
	nock(baseUrl)
		.get(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`)
		.reply(status, status === HttpStatusCode.Ok ? response : undefined);
};

export const mockSetIssuePropertyEndpoint = ({
	baseUrl,
	issueId,
	propertyKey,
	value,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	issueId: string;
	propertyKey: string;
	value: RequestBodyMatcher;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.put(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`, value)
		.reply(status);
};

export const mockDeleteIssuePropertyEndpoint = ({
	baseUrl,
	issueId,
	propertyKey,
}: {
	baseUrl: string;
	issueId: string;
	propertyKey?: string;
}) => {
	nock(baseUrl)
		.delete(`/rest/api/2/issue/${issueId}/properties/${propertyKey}`)
		.reply(200);
};
