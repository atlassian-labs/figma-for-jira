import { AxiosError, HttpStatusCode } from 'axios';

import { FigmaServiceCredentialsError } from './errors';
import { figmaAuthService } from './figma-auth-service';
import type { CreateDevResourcesRequest } from './figma-client';
import { figmaClient } from './figma-client';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import type {
	AtlassianDesign,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import { getLogger } from '../logger';

export const buildIssueTitle = (issueKey: string, issueSummary: string) => {
	return `[${issueKey}] ${issueSummary}`;
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

	fetchDesignById = async (
		designId: FigmaDesignIdentifier,
		atlassianUserId: string,
	): Promise<AtlassianDesign> => {
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		if (designId.nodeId) {
			const fileResponse = await figmaClient.getFile(
				designId.fileKey,
				{
					ids: [designId.nodeId],
					node_last_modified: true,
				},
				accessToken,
			);
			return transformNodeToAtlassianDesign({
				fileKey: designId.fileKey,
				nodeId: designId.nodeId,
				fileResponse,
			});
		} else {
			const fileResponse = await figmaClient.getFile(
				designId.fileKey,
				{ depth: 1 },
				accessToken,
			);
			return transformFileToAtlassianDesign({
				fileKey: designId.fileKey,
				fileResponse,
			});
		}
	};

	createDevResource = async ({
		designId,
		issueUrl,
		issueKey,
		issueTitle,
		atlassianUserId,
	}: {
		designId: FigmaDesignIdentifier;
		issueUrl: string;
		issueKey: string;
		issueTitle: string;
		atlassianUserId: string;
	}): Promise<void> => {
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		const devResource: CreateDevResourcesRequest = {
			name: buildIssueTitle(issueKey, issueTitle),
			url: issueUrl,
			file_key: designId.fileKey,
			node_id: designId.nodeIdOrDefaultDocumentId,
		};

		const response = await figmaClient.createDevResources(
			[devResource],
			accessToken,
		);

		if (response.errors?.length > 0) {
			getLogger().error(
				{ errors: response.errors },
				'Created dev resources with errors',
			);
		}
	};

	deleteDevResourceIfExists = async ({
		designId,
		issueUrl,
		atlassianUserId,
	}: {
		designId: FigmaDesignIdentifier;
		issueUrl: string;
		atlassianUserId: string;
	}): Promise<void> => {
		const credentials = await this.getValidCredentialsOrThrow(atlassianUserId);

		const { accessToken } = credentials;

		const { dev_resources } = await figmaClient.getDevResources({
			fileKey: designId.fileKey,
			nodeIds: designId.nodeIdOrDefaultDocumentId,
			accessToken,
		});

		const devResourceToDelete = dev_resources.find(
			(devResource) => devResource.url === issueUrl,
		);

		if (!devResourceToDelete) {
			getLogger().error(
				`No matching dev resource found to delete for file ${designId.fileKey} and node ${designId.nodeId}`,
			);
			return;
		}

		await figmaClient.deleteDevResource({
			fileKey: designId.fileKey,
			devResourceId: devResourceToDelete.id,
			accessToken,
		});
	};
}

export const figmaService = new FigmaService();
