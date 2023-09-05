import { FigmaServiceCredentialsError } from './errors';
import { figmaAuthService } from './figma-auth-service';
import { figmaClient } from './figma-client';
import type { CreateDevResourcesResponse } from './figma-client';
import type { FigmaUrlData } from './figma-transformer';
import {
	buildDevResource,
	extractDataFromFigmaUrl,
	transformFileToAtlassianDesign,
	transformNodeId,
	transformNodeToAtlassianDesign,
} from './figma-transformer';

import { DEFAULT_FIGMA_FILE_NODE_ID } from '../../common/constants';
import type {
	AtlassianDesign,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import type { AssociateWith } from '../../usecases';
import { getLogger } from '../logger';

// TODO: Replace with call to Jira service to get issue details
const getIssueDetailsStub = () => {
	return {
		issueUrl: 'https://jira-issue.com/123',
		issueTitle: 'Test Issue',
	};
};

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
			throw new FigmaServiceCredentialsError(
				atlassianUserId,
				e instanceof Error ? e : undefined,
			);
		}
	};

	fetchDesign = async (
		url: string,
		atlassianUserId: string,
		associateWith: AssociateWith,
	): Promise<AtlassianDesign> => {
		const { fileKey, nodeId, isPrototype } =
			extractDataFromFigmaUrlOrThrow(url);

		if (!associateWith.ari) {
			throw new Error('No ARI to associate');
		}

		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		if (nodeId) {
			const fileNodesResponse = await figmaClient.getFileNodes(
				fileKey,
				nodeId,
				accessToken,
			);
			return transformNodeToAtlassianDesign({
				nodeId,
				url,
				isPrototype,
				associateWith,
				fileNodesResponse,
			});
		} else {
			const fileResponse = await figmaClient.getFile(fileKey, accessToken);
			return transformFileToAtlassianDesign({
				url,
				fileKey,
				isPrototype,
				associateWith,
				fileResponse,
			});
		}
	};

	createDevResource = async (
		url: string,
		atlassianUserId: string,
	): Promise<CreateDevResourcesResponse> => {
		const { fileKey, nodeId } = extractDataFromFigmaUrlOrThrow(url);
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		// TODO: Replace with call to Jira service to get issue details
		const { issueUrl, issueTitle } = getIssueDetailsStub();

		const devResource = buildDevResource({
			name: issueTitle,
			url: issueUrl,
			file_key: fileKey,
			node_id: nodeId ? transformNodeId(nodeId) : DEFAULT_FIGMA_FILE_NODE_ID,
		});

		const response = await figmaClient.createDevResources(
			[devResource],
			accessToken,
		);

		if (response.errors.length > 0) {
			const errorMessage = response.errors.map((err) => err.error).join('|');
			getLogger().error(errorMessage, 'Created dev resources with errors');
		}

		return response;
	};
}

export const figmaService = new FigmaService();
