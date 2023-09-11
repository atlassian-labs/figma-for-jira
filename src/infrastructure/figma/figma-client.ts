import axios from 'axios';

import { getConfig } from '../../config';

export type GetOAuth2TokenResponse = {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
};

export type RefreshOAuth2TokenResponse = Omit<
	GetOAuth2TokenResponse,
	'refresh_token'
>;

export type MeResponse = {
	readonly id: string;
	readonly email: string;
	readonly handle: string;
	readonly img_url: string;
};

export type FileResponse = {
	readonly name: string;
	readonly role: string;
	readonly version: string;
	readonly lastModified: string;
	readonly editorType: string;
	readonly thumbnailUrl: string;
} & FileNode;

type FileNode = {
	readonly document: NodeDetails;
};

export type NodeDetails = {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	readonly devStatus?: NodeDevStatus;
};

export type NodeDevStatus = {
	readonly type: string;
};

export type FileNodesResponse = {
	readonly name: string;
	readonly role: string;
	readonly version: string;
	readonly lastModified: string;
	readonly editorType: string;
	readonly thumbnailUrl: string;
	readonly err: string;
	readonly nodes: Record<string, FileNode>;
};

export type DevResource = {
	readonly id: string;
	readonly name: string;
	readonly url: string;
	readonly file_key: string;
	readonly node_id: string;
};

export type CreateDevResourcesRequest = Omit<DevResource, 'id'>;

type CreateDevResourceError = {
	readonly file_key: string | null;
	readonly node_id: string | null;
	readonly error: string;
};

export type CreateDevResourcesResponse = {
	readonly links_created: DevResource[];
	readonly errors: CreateDevResourceError[];
};

type GetDevResourcesRequest = {
	readonly fileKey: string;
	readonly nodeIds?: string;
	readonly accessToken: string;
};

type GetDevResourcesResponse = {
	readonly dev_resources: DevResource[];
};

type DeleteDevResourceRequest = {
	readonly fileKey: string;
	readonly devResourceId: string;
	readonly accessToken: string;
};

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
	 * Returns a JSON object representing a Figma file/document including metadata about that file.
	 *
	 * @see https://www.figma.com/developers/api#get-files-endpoint
	 */
	getFile = async (
		fileKey: string,
		accessToken: string,
	): Promise<FileResponse> => {
		const response = await axios.get<FileResponse>(
			`${getConfig().figma.apiBaseUrl}/v1/files/${fileKey}`,
			{
				headers: {
					['Authorization']: `Bearer ${accessToken}`,
				},
			},
		);

		return response.data;
	};

	/**
	 * Returns metadata about a Figma file and nodes in that file referenced by ids.
	 *
	 * @see https://www.figma.com/developers/api#get-file-nodes-endpoint
	 */
	getFileNodes = async (
		fileKey: string,
		nodeIds: string,
		accessToken: string,
	): Promise<FileNodesResponse> => {
		const response = await axios.get<FileNodesResponse>(
			`${getConfig().figma.apiBaseUrl}/v1/files/${fileKey}/nodes`,
			{
				params: {
					ids: nodeIds,
				},
				headers: {
					['Authorization']: `Bearer ${accessToken}`,
				},
			},
		);

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
