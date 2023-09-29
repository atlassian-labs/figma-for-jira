import { HttpStatusCode } from 'axios';
import type { RequestBodyMatcher } from 'nock';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';

import type {
	CreateDevResourcesRequest,
	CreateWebhookRequest,
	CreateWebhookResponse,
	FileResponse,
	GetDevResourcesResponse,
	GetTeamProjectsResponse,
} from '../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateCreateWebhookResponse,
	generateGetDevResourcesResponse,
	generateGetFileResponseWithNodes,
	generateGetTeamProjectsResponse,
} from '../../infrastructure/figma/figma-client/testing';

export const mockFigmaMeEndpoint = ({
	baseUrl,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl).get('/v1/me').reply(status).persist();
};

export const mockFigmaGetFileEndpoint = ({
	baseUrl,
	fileKey,
	accessToken,
	query = {},
	status = HttpStatusCode.Ok,
	response,
}: {
	baseUrl: string;
	fileKey: string;
	accessToken: string;
	query?: Record<string, string>;
	status?: HttpStatusCode;
	response?: Record<string, unknown>;
}) => {
	nock(baseUrl, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.get(`/v1/files/${fileKey}`)
		.query(query)
		.reply(status, response ?? {});
};

export const mockFigmaGetFileWithNodesEndpoint = ({
	baseUrl,
	fileKey = uuidv4(),
	nodeIds,
	status = HttpStatusCode.Ok,
	response = generateGetFileResponseWithNodes({
		nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
	}),
}: {
	baseUrl: string;
	fileKey?: string;
	nodeIds: string[];
	status?: HttpStatusCode;
	response?: FileResponse;
}) => {
	nock(baseUrl)
		.get(`/v1/files/${fileKey}`)
		.query({ ids: nodeIds.join(','), node_last_modified: true })
		.reply(status, response);
};

export const mockFigmaCreateDevResourcesEndpoint = ({
	baseUrl,
	request,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	request?: CreateDevResourcesRequest | RequestBodyMatcher;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl).post('/v1/dev_resources').reply(status, request);
};

export const mockFigmaGetDevResourcesEndpoint = ({
	baseUrl,
	fileKey,
	nodeId,
	status = HttpStatusCode.Ok,
	response = generateGetDevResourcesResponse(),
}: {
	baseUrl: string;
	fileKey: string;
	nodeId: string;
	status?: HttpStatusCode;
	response?: GetDevResourcesResponse;
}) => {
	nock(baseUrl)
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
	baseUrl: string;
	fileKey: string;
	devResourceId: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.delete(`/v1/files/${fileKey}/dev_resources/${devResourceId}`)
		.reply(status);
};

export const mockFigmaCreateWebhookEndpoint = ({
	baseUrl,
	request,
	response = generateCreateWebhookResponse(),
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	webhookId?: string;
	teamId?: string;
	request?: CreateWebhookRequest | RequestBodyMatcher;
	response?: CreateWebhookResponse;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl).post('/v2/webhooks', request).reply(status, response);
};

export const mockFigmaDeleteWebhookEndpoint = ({
	baseUrl,
	webhookId,
	accessToken,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	webhookId: string;
	accessToken: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl, {
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
	baseUrl: string;
	teamId?: string;
	status?: HttpStatusCode;
	response?: GetTeamProjectsResponse;
}) => {
	nock(baseUrl).get(`/v1/teams/${teamId}/projects`).reply(status, response);
};
