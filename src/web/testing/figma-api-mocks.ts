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
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl).post('/v1/dev_resources').reply(status);
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
	webhookId = uuidv4(),
	teamId = uuidv4(),
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	webhookId?: string;
	teamId?: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.post('/v2/webhooks')
		.reply(status, {
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
	teamName = uuidv4(),
	status = HttpStatusCode.Ok,
}: {
	baseUrl: string;
	teamId?: string;
	teamName?: string;
	status?: HttpStatusCode;
}) => {
	nock(baseUrl)
		.get(`/v1/teams/${teamId}/projects`)
		.reply(status, { name: teamName, projects: [] });
};
