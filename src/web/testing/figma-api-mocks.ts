import type {
	PostWebhookRequestBody,
	PostWebhookResponse,
} from '@figma/rest-api-spec';
import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';

import type {
	CreateDevResourcesRequest,
	CreateDevResourcesResponse,
	ErrorResponse,
	GetDevResourcesResponse,
	GetFileMetaResponse,
	GetFileResponse,
	GetMeResponse,
	GetTeamProjectsResponse,
} from '../../infrastructure/figma/figma-client';
import {
	generateCreateDevResourcesResponse,
	generateCreateWebhookResponse,
	generateGetDevResourcesResponse,
	generateGetFileMetaResponse,
	generateGetFileResponse,
	generateGetMeResponse,
	generateGetTeamProjectsResponse,
} from '../../infrastructure/figma/figma-client/testing';

export const mockFigmaMeEndpoint = ({
	baseUrl,
	status = HttpStatusCode.Ok,
	response = generateGetMeResponse(),
}: {
	baseUrl: URL;
	status?: HttpStatusCode;
	response?: GetMeResponse;
}) => {
	nock(baseUrl.toString()).get('/v1/me').reply(status, response).persist();
};

export const mockFigmaGetFileMetaEndpoint = ({
	baseUrl,
	fileKey,
	accessToken,
	status = HttpStatusCode.Ok,
	response = generateGetFileMetaResponse(),
}: {
	baseUrl: URL;
	fileKey: string;
	accessToken: string;
	query?: Record<string, string>;
	status?: HttpStatusCode;
	response?: GetFileMetaResponse;
}) => {
	nock(baseUrl.toString(), {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`/v1/files/${fileKey}/meta`)
		.reply(status, response);
};

export const mockFigmaGetFileEndpoint = ({
	baseUrl,
	fileKey,
	accessToken,
	query = {},
	status = HttpStatusCode.Ok,
	response = generateGetFileResponse(),
}: {
	baseUrl: URL;
	fileKey: string;
	accessToken: string;
	query?: Record<string, string>;
	status?: HttpStatusCode;
	response?: GetFileResponse;
}) => {
	nock(baseUrl.toString(), {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`/v1/files/${fileKey}`)
		.query(query)
		.reply(status, response);
};

export const mockFigmaCreateDevResourcesEndpoint = ({
	baseUrl,
	request,
	status = HttpStatusCode.Ok,
	response = generateCreateDevResourcesResponse(),
}: {
	baseUrl: URL;
	request?: CreateDevResourcesRequest | RequestBodyMatcher;
	status?: HttpStatusCode;
	response?: CreateDevResourcesResponse;
}) => {
	nock(baseUrl.toString())
		.post('/v1/dev_resources', request)
		.reply(status, response);
};

export const mockFigmaGetDevResourcesEndpoint = ({
	baseUrl,
	fileKey,
	nodeId,
	status = HttpStatusCode.Ok,
	response = generateGetDevResourcesResponse(),
}: {
	baseUrl: URL;
	fileKey: string;
	nodeId: string;
	status?: HttpStatusCode;
	response?: GetDevResourcesResponse;
}) => {
	nock(baseUrl.toString())
		.get(`/v1/files/${fileKey}/dev_resources`)
		.query({ node_ids: nodeId })
		.reply(status, response);
};

export const mockFigmaDeleteDevResourcesEndpoint = ({
	baseUrl,
	fileKey,
	devResourceId,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: URL;
	fileKey: string;
	devResourceId: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString())
		.delete(`/v1/files/${fileKey}/dev_resources/${devResourceId}`)
		.reply(status);
};

export const mockFigmaCreateWebhookEndpoint = ({
	baseUrl,
	request,
	response = generateCreateWebhookResponse(),
	status = HttpStatusCode.Ok,
}: {
	baseUrl: URL;
	webhookId?: string;
	teamId?: string;
	request?: PostWebhookRequestBody | RequestBodyMatcher;
	response?: PostWebhookResponse | ErrorResponse;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString())
		.post('/v2/webhooks', request)
		.reply(status, response);
};

export const mockFigmaDeleteWebhookEndpoint = ({
	baseUrl,
	webhookId,
	accessToken,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: URL;
	webhookId: string;
	accessToken: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl.toString(), {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.delete(`/v2/webhooks/${webhookId}`)
		.reply(status);
};

export const mockFigmaGetTeamProjectsEndpoint = ({
	baseUrl,
	teamId = uuidv4(),
	status = HttpStatusCode.Ok,
	response = generateGetTeamProjectsResponse(),
}: {
	baseUrl: URL;
	teamId?: string;
	status?: HttpStatusCode;
	response?: GetTeamProjectsResponse;
}) => {
	nock(baseUrl.toString())
		.get(`/v1/teams/${teamId}/projects`)
		.reply(status, response);
};
