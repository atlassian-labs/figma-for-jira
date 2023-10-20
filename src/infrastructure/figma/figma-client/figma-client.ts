import axios from 'axios';

import type {
	CreateDevResourcesRequest,
	CreateDevResourcesResponse,
	CreateWebhookRequest,
	CreateWebhookResponse,
	DeleteDevResourceRequest,
	FileResponse,
	GetDevResourcesRequest,
	GetDevResourcesResponse,
	GetFileParams,
	GetOAuth2TokenResponse,
	GetTeamProjectsResponse,
	MeResponse,
	RefreshOAuth2TokenResponse,
} from './types';

import { getConfig } from '../../../config';
import { withAxiosErrorTranslation } from '../../axios-utils';

/**
 * A generic Figma API client.
 *
 * @see https://www.figma.com/developers/api
 * @internal
 */
export class FigmaClient {
	/**
	 * Returns the user's access token.
	 *
	 * @see https://www.figma.com/developers/api#oauth2
	 */
	getOAuth2Token = async (code: string): Promise<GetOAuth2TokenResponse> =>
		withAxiosErrorTranslation(async () => {
			const params = new URLSearchParams();
			params.append('client_id', getConfig().figma.oauth2.clientId);
			params.append('client_secret', getConfig().figma.oauth2.clientSecret);
			params.append(
				'redirect_uri',
				`${getConfig().app.baseUrl}/figma/oauth/callback`,
			);
			params.append('code', code);
			params.append('grant_type', 'authorization_code');

			const response = await axios.post<GetOAuth2TokenResponse>(
				`${
					getConfig().figma.oauth2.authorizationServerBaseUrl
				}/api/oauth/token`,
				null,
				{
					params,
				},
			);

			return response.data;
		});

	/**
	 * Request a new access token using a refresh token.
	 *
	 * @see https://www.figma.com/developers/api#refresh-oauth2
	 */
	refreshOAuth2Token = async (
		refreshToken: string,
	): Promise<RefreshOAuth2TokenResponse> =>
		withAxiosErrorTranslation(async () => {
			const params = new URLSearchParams();
			params.append('client_id', getConfig().figma.oauth2.clientId);
			params.append('client_secret', getConfig().figma.oauth2.clientSecret);
			params.append('refresh_token', refreshToken);

			const response = await axios.post<RefreshOAuth2TokenResponse>(
				`${
					getConfig().figma.oauth2.authorizationServerBaseUrl
				}/api/oauth/refresh`,
				null,
				{ params },
			);

			return response.data;
		});

	/**
	 * Returns user information for the authenticated user.
	 *
	 * @see https://www.figma.com/developers/api#get-me-endpoint
	 */
	me = async (accessToken: string): Promise<MeResponse> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.get<MeResponse>(
				`${getConfig().figma.apiBaseUrl}/v1/me`,
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});

	/**
	 * Returns a Figma file/document including metadata about that file.
	 *
	 * @see https://www.figma.com/developers/api#get-files-endpoint
	 */
	getFile = async (
		fileKey: string,
		params: GetFileParams,
		accessToken: string,
	): Promise<FileResponse> =>
		withAxiosErrorTranslation(async () => {
			const url = new URL(
				`${getConfig().figma.apiBaseUrl}/v1/files/${fileKey}`,
			);

			if (params.ids != null) {
				url.searchParams.append('ids', params.ids.join(','));
			}
			if (params.depth != null) {
				url.searchParams.append('depth', params.depth.toString());
			}
			if (params.node_last_modified != null) {
				url.searchParams.append(
					'node_last_modified',
					params.node_last_modified.toString(),
				);
			}

			const response = await axios.get<FileResponse>(url.toString(), {
				headers: {
					['Authorization']: `Bearer ${accessToken}`,
				},
			});

			return response.data;
		});

	/**
	 * Creates Figma Dev Resources using the POST dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#post-dev-resources-endpoint
	 */
	createDevResources = async (
		devResources: CreateDevResourcesRequest[],
		accessToken: string,
	): Promise<CreateDevResourcesResponse> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.post<CreateDevResourcesResponse>(
				`${getConfig().figma.apiBaseUrl}/v1/dev_resources`,
				{
					dev_resources: devResources,
				},
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});

	/**
	 * Fetches Figma Dev Resources using the GET dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#get-dev-resources-endpoint
	 */
	getDevResources = async ({
		fileKey,
		nodeIds: node_ids,
		accessToken,
	}: GetDevResourcesRequest): Promise<GetDevResourcesResponse> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.get<GetDevResourcesResponse>(
				`${getConfig().figma.apiBaseUrl}/v1/files/${fileKey}/dev_resources`,
				{
					params: {
						node_ids,
					},
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});

	/**
	 * Deletes a Figma Dev Resource using the DELETE dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#delete-dev-resources-endpoint
	 */
	deleteDevResource = async ({
		fileKey,
		devResourceId,
		accessToken,
	}: DeleteDevResourceRequest): Promise<void> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.delete<void>(
				`${
					getConfig().figma.apiBaseUrl
				}/v1/files/${fileKey}/dev_resources/${devResourceId}`,
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});

	/**
	 * Creates a new Figma webhook using the POST webhook endpoint
	 *
	 * @see https://www.figma.com/developers/api#webhooks-v2-post-endpoint
	 */
	createWebhook = async (
		request: CreateWebhookRequest,
		accessToken: string,
	): Promise<CreateWebhookResponse> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.post<CreateWebhookResponse>(
				`${getConfig().figma.apiBaseUrl}/v2/webhooks`,
				request,
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});

	/**
	 * Deletes the specified webhook.
	 *
	 * @see https://www.figma.com/developers/api#webhooks-v2-delete-endpoint
	 */
	deleteWebhook = async (
		webhookId: string,
		accessToken: string,
	): Promise<void> =>
		withAxiosErrorTranslation(async () => {
			await axios.delete<CreateWebhookResponse>(
				`${getConfig().figma.apiBaseUrl}/v2/webhooks/${webhookId}`,
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);
		});

	getTeamProjects = async (
		teamId: string,
		accessToken: string,
	): Promise<GetTeamProjectsResponse> =>
		withAxiosErrorTranslation(async () => {
			const response = await axios.get<GetTeamProjectsResponse>(
				`${getConfig().figma.apiBaseUrl}/v1/teams/${teamId}/projects`,
				{
					headers: {
						['Authorization']: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data;
		});
}

export const figmaClient = new FigmaClient();
