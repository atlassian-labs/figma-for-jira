import { AxiosError, HttpStatusCode } from 'axios';

import { FigmaServiceCredentialsError } from './errors';
import { figmaAuthService } from './figma-auth-service';
import type {
	CreateDevResourcesRequest,
	CreateWebhookRequest,
} from './figma-client';
import { figmaClient, FigmaClientNotFoundError } from './figma-client';
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

export const buildIssueTitle = (issueKey: string, issueSummary: string) => {
	return `[${issueKey}] ${issueSummary}`;
};

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

	createDevResource = async ({
		designId,
		issueUrl,
		issueKey,
		issueTitle,
		user,
	}: {
		designId: FigmaDesignIdentifier;
		issueUrl: string;
		issueKey: string;
		issueTitle: string;
		user: ConnectUserInfo;
	}): Promise<void> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

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
		user,
	}: {
		designId: FigmaDesignIdentifier;
		issueUrl: string;
		user: ConnectUserInfo;
	}): Promise<void> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

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

	deleteWebhook = async (
		webhookId: string,
		user: ConnectUserInfo,
	): Promise<void> => {
		const { accessToken } = await this.getValidCredentialsOrThrow(user);

		try {
			await figmaClient.deleteWebhook(webhookId, accessToken);
		} catch (e) {
			if (e instanceof FigmaClientNotFoundError) return;

			throw e;
		}
	};
}

export const figmaService = new FigmaService();
