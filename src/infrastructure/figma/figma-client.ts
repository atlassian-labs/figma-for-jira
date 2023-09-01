import axios from 'axios';

import { getConfig } from '../../config';
import { getLogger } from '../logger';

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
	type: string;
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
	id: string;
	name: string;
	url: string;
	file_key: string;
	node_id?: string;
};

export type DevResourceCreateParams = Omit<DevResource, 'id'>;

type CreateDevResourceError = {
	file_key: string | null;
	node_id: string | null;
	error: string;
};

export type CreateDevResourcesResponse = {
	links_created: DevResource[];
	errors: CreateDevResourceError[];
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
		try {
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
		} catch (error: unknown) {
			getLogger().error(`Failed to exchange code for access token.`, error);
			throw error;
		}
	};

	/**
	 * Request a new access token using a refresh token.
	 *
	 * @see https://www.figma.com/developers/api#refresh-oauth2
	 */
	refreshOAuth2Token = async (
		refreshToken: string,
	): Promise<RefreshOAuth2TokenResponse> => {
		try {
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
		} catch (error: unknown) {
			getLogger().error(`Failed to refresh access token.`, error);
			throw error;
		}
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

	createDevResources = async (
		devResources: DevResourceCreateParams[],
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
}

export const figmaClient = new FigmaClient();
