import { HttpStatusCode } from 'axios';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';

import { getConfig } from '../../config';
import type {
	FileResponse,
	GetDevResourcesResponse,
} from '../../infrastructure/figma/figma-client';
import {
	generateChildNode,
	generateGetDevResourcesResponse,
	generateGetFileResponseWithNodes,
} from '../../infrastructure/figma/figma-client/testing';

export const mockMeEndpoint = ({
	baseUrl,
	success = true,
}: {
	baseUrl: string;
	success?: boolean;
}) => {
	const statusCode = success ? HttpStatusCode.Ok : HttpStatusCode.Forbidden;
	nock(baseUrl).get('/v1/me').reply(statusCode).persist();
};

export const mockGetFileEndpoint = ({
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

export const mockGetFileWithNodesEndpoint = ({
	baseUrl,
	fileKey = uuidv4(),
	nodeIds,
	response = generateGetFileResponseWithNodes({
		nodes: nodeIds.map((nodeId) => generateChildNode({ id: nodeId })),
	}),
	success = true,
}: {
	baseUrl: string;
	fileKey?: string;
	nodeIds: string[];
	response?: FileResponse;
	success?: boolean;
}) => {
	nock(baseUrl)
		.get(`/v1/files/${fileKey}`)
		.query({ ids: nodeIds.join(','), node_last_modified: true })
		.reply(
			success ? HttpStatusCode.Ok : HttpStatusCode.InternalServerError,
			response,
		);
};

export const mockCreateWebhookEndpoint = ({
	baseUrl,
	webhookId = uuidv4(),
	teamId = uuidv4(),
	success = true,
}: {
	baseUrl: string;
	webhookId?: string;
	teamId?: string;
	success?: boolean;
}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(baseUrl)
		.post('/v2/webhooks')
		.reply(statusCode, {
			id: webhookId,
			team_id: teamId,
			event_type: 'FILE_UPDATE',
			client_id: getConfig().figma.clientId,
			endpoint: `${getConfig().app.baseUrl}/figma/webhooks`,
			passcode: 'NOT_USED',
			status: 'ACTIVE',
			description: 'Figma for Jira',
			protocol_version: '2',
		});
};

export const mockGetTeamProjectsEndpoint = ({
	baseUrl,
	teamId = uuidv4(),
	teamName = uuidv4(),
	success = true,
}: {
	baseUrl: string;
	teamId?: string;
	teamName?: string;
	success?: boolean;
}) => {
	const statusCode = success
		? HttpStatusCode.Ok
		: HttpStatusCode.InternalServerError;
	nock(baseUrl)
		.get(`/v1/teams/${teamId}/projects`)
		.reply(statusCode, { name: teamName, projects: [] });
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
	status: HttpStatusCode;
}) => {
	nock(baseUrl, {
		reqheaders: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.delete(`/v2/webhooks/${webhookId}`)
		.reply(status);
};

export const mockCreateDevResourcesEndpoint = ({
	baseUrl,
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl).post('/v1/dev_resources').reply(status);
};

export const mockGetDevResourcesEndpoint = ({
	baseUrl,
	fileKey,
	nodeId,
	response = generateGetDevResourcesResponse(),
}: {
	baseUrl: string;
	fileKey: string;
	nodeId: string;
	response?: GetDevResourcesResponse;
}) => {
	nock(baseUrl)
		.get(`/v1/files/${fileKey}/dev_resources`)
		.query({ node_ids: nodeId })
		.reply(HttpStatusCode.Ok, response);
};

export const mockDeleteDevResourcesEndpoint = ({
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
