import axios from 'axios';

import type {
	CreateDevResourcesRequest,
	CreateDevResourcesResponse,
	DeleteDevResourceRequest,
	FileResponse,
	GetDevResourcesRequest,
	GetDevResourcesResponse,
	GetFileParams,
	GetOAuth2TokenResponse,
	MeResponse,
	RefreshOAuth2TokenResponse,
} from './types';

import { getConfig } from '../../../config';

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
	getOAuth2Token = async (code: string): Promise<GetOAuth2TokenResponse> => {
		const params = new URLSearchParams();
		params.append('client_id', getConfig().figma.clientId);
		params.append('client_secret', getConfig().figma.clientSecret);
		params.append('redirect_uri', `${getConfig().app.baseUrl}/auth/callback`);
		params.append('code', code);
		params.append('grant_type', 'authorization_code');

		const response = await axios.post<GetOAuth2TokenResponse>(
			`${getConfig().figma.oauthApiBaseUrl}/api/oauth/token`,
			null,
			{
				params,
			},
		);

		return response.data;
	};

	/**
	 * Request a new access token using a refresh token.
	 *
	 * @see https://www.figma.com/developers/api#refresh-oauth2
	 */
	refreshOAuth2Token = async (
		refreshToken: string,
	): Promise<RefreshOAuth2TokenResponse> => {
		const params = new URLSearchParams();
		params.append('client_id', getConfig().figma.clientId);
		params.append('client_secret', getConfig().figma.clientSecret);
		params.append('refresh_token', refreshToken);

		const response = await axios.post<RefreshOAuth2TokenResponse>(
			`${getConfig().figma.oauthApiBaseUrl}/api/oauth/refresh`,
			null,
			{ params },
		);

		return response.data;
	};

	/**
	 * Returns user information for the authenticated user.
	 *
	 * @see https://www.figma.com/developers/api#get-me-endpoint
	 */
	me = async (accessToken: string): Promise<MeResponse> => {
		const response = await axios.get<MeResponse>(
			`${getConfig().figma.apiBaseUrl}/v1/me`,
			{
				headers: {
					['Authorization']: `Bearer ${accessToken}`,
				},
			},
		);

		return response.data;
	};

	/**
	 * Returns a Figma file/document including metadata about that file.
	 *
	 * @see https://www.figma.com/developers/api#get-files-endpoint
	 */
	getFile = async (
		fileKey: string,
		params: GetFileParams,
		accessToken: string,
	): Promise<FileResponse> => {
		const url = new URL(`${getConfig().figma.apiBaseUrl}/v1/files/${fileKey}`);

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
	};

	/**
	 * Creates Figma Dev Resources using the POST dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#post-dev-resources-endpoint
	 */
	createDevResources = async (
		devResources: CreateDevResourcesRequest[],
		accessToken: string,
	): Promise<CreateDevResourcesResponse> => {
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
	};

	/**
	 * Fetches Figma Dev Resources using the GET dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#get-dev-resources-endpoint
	 */
	getDevResources = async ({
		fileKey,
		nodeIds: node_ids,
		accessToken,
	}: GetDevResourcesRequest): Promise<GetDevResourcesResponse> => {
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
	};

	/**
	 * Deletes a Figma Dev Resource using the DELETE dev resources endpoint
	 *
	 * @see https://www.figma.com/developers/api#delete-dev-resources-endpoint
	 */
	deleteDevResource = async ({
		fileKey,
		devResourceId,
		accessToken,
	}: DeleteDevResourceRequest): Promise<void> => {
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
	};
}

export const figmaClient = new FigmaClient();