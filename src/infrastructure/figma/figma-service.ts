import { AxiosError, HttpStatusCode } from 'axios';

import { FigmaServiceCredentialsError } from './errors';
import { figmaAuthService } from './figma-auth-service';
import type { CreateDevResourcesResponse } from './figma-client';
import { figmaClient } from './figma-client';
import type { FigmaUrlData } from './figma-transformer';
import {
	buildDevResource,
	extractDataFromFigmaUrl,
	parseDesignIdOrThrow,
	transformFileToAtlassianDesign,
	transformNodeIdForStorage,
	transformNodeToAtlassianDesign,
} from './figma-transformer';

import type {
	AtlassianDesign,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import { getLogger } from '../logger';

export const DEFAULT_FIGMA_FILE_NODE_ID = '0:0';

const extractDataFromFigmaUrlOrThrow = (url: string): FigmaUrlData => {
	const urlData = extractDataFromFigmaUrl(url);
	if (!urlData) {
		throw new Error(`Received invalid Figma URL: ${url}`);
	}
	return urlData;
};

export class FigmaService {
	getValidCredentialsOrThrow = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials> => {
		try {
			const credentials =
				await figmaAuthService.getCredentials(atlassianUserId);
			await figmaClient.me(credentials.accessToken);

			return credentials;
		} catch (e: unknown) {
			if (
				e instanceof AxiosError &&
				e.response?.status !== HttpStatusCode.Unauthorized &&
				e.response?.status !== HttpStatusCode.Forbidden
			) {
				throw e;
			}

			throw new FigmaServiceCredentialsError(
				atlassianUserId,
				e instanceof Error ? e : undefined,
			);
		}
	};

	fetchDesignByUrl = async (
		url: string,
		atlassianUserId: string,
	): Promise<AtlassianDesign> => {
		const { fileKey, nodeId, isPrototype } =
			extractDataFromFigmaUrlOrThrow(url);

		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		if (nodeId) {
			const fileNodesResponse = await figmaClient.getFileNodes(
				fileKey,
				nodeId,
				accessToken,
			);
			return transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				isPrototype,
				fileNodesResponse,
			});
		} else {
			const fileResponse = await figmaClient.getFile(fileKey, accessToken);
			return transformFileToAtlassianDesign({
				fileKey,
				isPrototype,
				fileResponse,
			});
		}
	};

	fetchDesignById = async (
		id: string,
		atlassianUserId: string,
	): Promise<AtlassianDesign> => {
		const [fileKey, nodeId] = parseDesignIdOrThrow(id);

		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		if (nodeId !== DEFAULT_FIGMA_FILE_NODE_ID) {
			const fileNodesResponse = await figmaClient.getFileNodes(
				fileKey,
				nodeId,
				accessToken,
			);
			return transformNodeToAtlassianDesign({
				fileKey,
				nodeId,
				isPrototype: false,
				fileNodesResponse,
			});
		} else {
			const fileResponse = await figmaClient.getFile(fileKey, accessToken);
			return transformFileToAtlassianDesign({
				fileKey,
				isPrototype: false,
				fileResponse,
			});
		}
	};

	createDevResource = async ({
		designUrl,
		issueUrl,
		issueTitle,
		atlassianUserId,
	}: {
		designUrl: string;
		issueUrl: string;
		issueTitle: string;
		atlassianUserId: string;
	}): Promise<CreateDevResourcesResponse> => {
		const { fileKey, nodeId } = extractDataFromFigmaUrlOrThrow(designUrl);
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		const devResource = buildDevResource({
			name: issueTitle,
			url: issueUrl,
			file_key: fileKey,
			node_id: nodeId
				? transformNodeIdForStorage(nodeId)
				: DEFAULT_FIGMA_FILE_NODE_ID,
		});

		const response = await figmaClient.createDevResources(
			[devResource],
			accessToken,
		);

		if (response.errors?.length > 0) {
			const errorMessage = response.errors.map((err) => err.error).join('|');
			getLogger().error(errorMessage, 'Created dev resources with errors');
		}

		return response;
	};

	deleteDevResourceIfExists = async ({
		designId,
		issueUrl,
		atlassianUserId,
	}: {
		designId: string;
		issueUrl: string;
		atlassianUserId: string;
	}): Promise<void> => {
		const [fileKey, nodeId] = parseDesignIdOrThrow(designId);
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		const { dev_resources } = await figmaClient.getDevResources({
			fileKey,
			...(nodeId && { nodeIds: unprettifyNodeId(nodeId) }),
			accessToken,
		});

		const devResourceToDelete = dev_resources.find(
			(devResource) => devResource.url === issueUrl,
		);

		if (!devResourceToDelete) {
			getLogger().error(
				`No matching dev resource found to delete for file ${fileKey} and node ${nodeId}`,
			);
			return;
		}

		return await figmaClient.deleteDevResource({
			fileKey,
			devResourceId: devResourceToDelete.id,
			accessToken,
		});
	};
}

export const figmaService = new FigmaService();
