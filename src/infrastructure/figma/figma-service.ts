import { AxiosError, HttpStatusCode } from 'axios';

import { FigmaServiceCredentialsError, FigmaServiceError } from './errors';
import { figmaAuthService } from './figma-auth-service';
import type {
	CreateDevResourcesRequest,
	CreateWebhookRequest,
} from './figma-client';
import { figmaClient } from './figma-client';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import { getConfig } from '../../config';
import type {
	AtlassianDesign,
	ConnectUserInfo,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
} from '../../domain/entities';
import { getLogger } from '../logger';

export const buildDevResourceNameFromJiraIssue = (
	issueKey: string,
	issueSummary: string,
) => `[${issueKey}] ${issueSummary}`;

export class FigmaService {
	getValidCredentialsOrThrow = async (
		user: ConnectUserInfo,
	): Promise<FigmaOAuth2UserCredentials> => {
		try {
			const credentials = await figmaAuthService.getCredentials(user);
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
				user.atlassianUserId,
				e instanceof Error ? e : undefined,
			);
		}
	};

	fetchDesignById = async (
		designId: FigmaDesignIdentifier,
		user: ConnectUserInfo,
	): Promise<AtlassianDesign> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

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

	fetchDesignsByIds = async (
		designIds: FigmaDesignIdentifier[],
		user: ConnectUserInfo,
	): Promise<AtlassianDesign[]> => {
		if (!designIds.length) {
			return [];
		}

		// Ensure all design identifiers have the same file key
		const fileKey = designIds[0].fileKey;
		for (const designId of designIds.slice(1)) {
			if (designId.fileKey !== fileKey) {
				throw new FigmaServiceError('designIds must all have the same fileKey');
			}
		}

		const credentials = await this.getValidCredentialsOrThrow(user);

		const { accessToken } = credentials;

		const fileResponse = await figmaClient.getFile(
			fileKey,
			{
				ids: designIds.flatMap((designId) =>
					designId.nodeId ? designId.nodeId : [],
				),
				node_last_modified: true,
			},
			accessToken,
		);

		return designIds.map((designId) => {
			if (!designId.nodeId) {
				return transformFileToAtlassianDesign({
					fileKey: designId.fileKey,
					fileResponse,
				});
			} else {
				return transformNodeToAtlassianDesign({
					fileKey: designId.fileKey,
					nodeId: designId.nodeId,
					fileResponse,
				});
			}
		});
	};

	createDevResourceForJiraIssue = async ({
		designId,
		issue,
		user,
	}: {
		designId: FigmaDesignIdentifier;
		issue: {
			url: string;
			key: string;
			title: string;
		};
		user: ConnectUserInfo;
	}): Promise<void> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

		const devResource: CreateDevResourcesRequest = {
			name: buildDevResourceNameFromJiraIssue(issue.key, issue.title),
			url: issue.url,
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
		devResourceUrl,
		user,
	}: {
		designId: FigmaDesignIdentifier;
		devResourceUrl: string;
		user: ConnectUserInfo;
	}): Promise<void> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

		const { dev_resources } = await figmaClient.getDevResources({
			fileKey: designId.fileKey,
			nodeIds: designId.nodeIdOrDefaultDocumentId,
			accessToken,
		});

		const devResourceToDelete = dev_resources.find(
			(devResource) => devResource.url === devResourceUrl,
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

	createFileUpdateWebhook = async (
		teamId: string,
		passcode: string,
		user: ConnectUserInfo,
	): Promise<{ webhookId: string; teamId: string }> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

		const request: CreateWebhookRequest = {
			event_type: 'FILE_UPDATE',
			team_id: teamId,
			endpoint: `${getConfig().app.baseUrl}/figma/webhook`,
			passcode,
			description: 'Figma for Jira Cloud',
		};

		const result = await figmaClient.createWebhook(request, accessToken);
		return { webhookId: result.id, teamId: result.team_id };
	};

	/**
	 * Tries to delete the given webhook. It makes the best effort to delete the webhook but does not throw an error
	 * in case of a failure since it can be caused by valid scenarios (e.g., a Figma team admin revoked his/her
	 * token or was deleted from the organization).
	 *
	 * As a result, it is possible to get orphaned active and constantly failing webhooks.
	 *
	 * @remarks
	 * Ideally, they can be deleted automatically on the Figma side. However, according to the Figma docs,
	 * "Figma does not currently deactivate endpoints with frequent errors.".
	 *
	 * @see https://www.figma.com/developers/api#webhooks-v2-intro
	 */
	tryDeleteWebhook = async (
		webhookId: string,
		user: ConnectUserInfo,
	): Promise<void> => {
		try {
			const { accessToken } = await this.getValidCredentialsOrThrow(user);
			await figmaClient.deleteWebhook(webhookId, accessToken);
		} catch (e: unknown) {
			getLogger().warn(
				e,
				`Failed to remove webhook ${webhookId} for user ${user.atlassianUserId}.`,
				user,
			);
		}
	};

	getTeamName = async (
		teamId: string,
		user: ConnectUserInfo,
	): Promise<string> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

		const response = await figmaClient.getTeamProjects(teamId, accessToken);
		return response.name;
	};
}

export const figmaService = new FigmaService();
