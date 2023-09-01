import { AxiosError } from 'axios';

import {
	figmaAuthService,
	NoFigmaCredentialsError,
	RefreshFigmaCredentialsError,
} from './figma-auth-service';
import { CreateDevResourcesResponse, figmaClient } from './figma-client';
import {
	buildDevResource,
	extractDataFromFigmaUrl,
	FigmaUrlData,
	transformFileToAtlassianDesign,
	transformNodeId,
	transformNodeToAtlassianDesign,
} from './figma-transformer';

import { DEFAULT_FIGMA_FILE_NODE_ID } from '../../common/constants';
import { HttpStatus } from '../../common/http-status';
import {
	AtlassianDesign,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import { AssociateWith } from '../../web/routes/entities';
import { getLogger } from '../logger';

const validateFigmaUrl = (url: string): FigmaUrlData => {
	const urlData = extractDataFromFigmaUrl(url);
	if (!urlData) {
		const errorMessage = `Received invalid Figma URL: ${url}`;
		getLogger().error(errorMessage);
		throw new Error(errorMessage);
	}
	return urlData;
};

export class FigmaService {
	getValidCredentials = async (
		atlassianUserId: string,
	): Promise<FigmaOAuth2UserCredentials | null> => {
		try {
			const credentials =
				await figmaAuthService.getCredentials(atlassianUserId);
			await figmaClient.me(credentials.accessToken);

			return credentials;
		} catch (e: unknown) {
			if (
				e instanceof NoFigmaCredentialsError ||
				e instanceof RefreshFigmaCredentialsError
			)
				return null;

			const forbidden =
				e instanceof AxiosError && e?.response?.status == HttpStatus.FORBIDDEN;

			if (forbidden) return null;

			throw e;
		}
	};

	fetchDesign = async (
		url: string,
		atlassianUserId: string,
		associateWith: AssociateWith,
	): Promise<AtlassianDesign> => {
		const { fileKey, nodeId, isPrototype } = validateFigmaUrl(url);

		if (!associateWith.ari) {
			throw new Error('No ARI to associate');
		}

		const credentials = await this.getValidCredentials(atlassianUserId);
		if (!credentials) {
			throw new Error('Invalid credentials');
		}

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
		associateWith: AssociateWith,
	): Promise<CreateDevResourcesResponse> => {
		try {
			const { fileKey, nodeId } = validateFigmaUrl(url);
			const credentials = await this.getValidCredentials(atlassianUserId);
			if (!credentials) {
				throw new Error('Invalid auth');
			}

			const { accessToken } = credentials;

			// TODO: Call Jira service to get issue details
			const issueUrl = `https://jira-issue.com/${associateWith.ari}`;
			const issueTitle = `placeholder-issue-title-${associateWith.ari}`;

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
		} catch (err) {
			getLogger().error(err, 'Failed to create dev resources');
			throw err;
		}
	};
}

export const figmaService = new FigmaService();
