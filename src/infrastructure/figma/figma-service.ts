import {
	figmaAuthService,
	MissingOrInvalidCredentialsFigmaAuthServiceError,
} from './figma-auth-service';
import type { CreateWebhookRequest } from './figma-client';
import { figmaClient } from './figma-client';
import {
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
} from './transformers';

import { CauseAwareError } from '../../common/errors';
import { isString } from '../../common/string-utils';
import { getConfig } from '../../config';
import type {
	AtlassianDesign,
	ConnectUserInfo,
	FigmaDesignIdentifier,
} from '../../domain/entities';
import {
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
	UnauthorizedHttpClientError,
} from '../http-client-errors';
import { getLogger } from '../logger';

const buildDevResourceNameFromJiraIssue = (
	issueKey: string,
	issueSummary: string,
) => `[${issueKey}] ${issueSummary}`;

export class FigmaService {
	/**
	 * Checks whether the given user authorized the app to access Figma.
	 */
	checkAuth = async (user: ConnectUserInfo): Promise<boolean> => {
		try {
			await this.withErrorTranslation(async () => {
				const credentials = await figmaAuthService.getCredentials(user);
				await figmaClient.me(credentials.accessToken);
			});
			return true;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) return false;
			throw e;
		}
	};

	/**
	 * Return Atlassian design representation for the given Figma design.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	fetchDesignById = async (
		designId: FigmaDesignIdentifier,
		user: ConnectUserInfo,
	): Promise<AtlassianDesign> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

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
		});

	/**
	 * Return Atlassian design representations for the given Figma designs.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	fetchDesignsByIds = async (
		designIds: FigmaDesignIdentifier[],
		user: ConnectUserInfo,
	): Promise<AtlassianDesign[]> =>
		this.withErrorTranslation(async () => {
			if (!designIds.length) {
				return [];
			}

			// Ensure all design identifiers have the same file key
			const fileKey = designIds[0].fileKey;
			const sameFileKey = designIds.every(
				(designId) => designId.fileKey === fileKey,
			);
			if (!sameFileKey) {
				throw new Error('designIds must all have the same fileKey');
			}

			const credentials = await figmaAuthService.getCredentials(user);

			const { accessToken } = credentials;

			const fileResponse = await figmaClient.getFile(
				fileKey,
				{
					ids: designIds.map((id) => id.nodeId).filter(isString),
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
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
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
	}): Promise<void> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

			const response = await figmaClient.createDevResources(
				{
					dev_resources: [
						{
							name: buildDevResourceNameFromJiraIssue(issue.key, issue.title),
							url: issue.url,
							file_key: designId.fileKey,
							node_id: designId.nodeIdOrDefaultDocumentId,
						},
					],
				},
				accessToken,
			);

			if (response.errors?.length > 0) {
				getLogger().error(
					{ errors: response.errors },
					'Created dev resources with errors',
				);
			}
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	deleteDevResourceIfExists = async ({
		designId,
		devResourceUrl,
		user,
	}: {
		designId: FigmaDesignIdentifier;
		devResourceUrl: string;
		user: ConnectUserInfo;
	}): Promise<void> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

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
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	createFileUpdateWebhook = async (
		teamId: string,
		passcode: string,
		user: ConnectUserInfo,
	): Promise<{ webhookId: string; teamId: string }> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

			const request: CreateWebhookRequest = {
				event_type: 'FILE_UPDATE',
				team_id: teamId,
				endpoint: `${getConfig().app.baseUrl}/figma/webhook`,
				passcode,
				description: 'Figma for Jira Cloud',
			};

			const result = await figmaClient.createWebhook(request, accessToken);
			return { webhookId: result.id, teamId: result.team_id };
		});

	/**
	 * Tries to delete the given webhook.
	 *
	 * It makes the best effort to delete the webhook but does not throw an error
	 * in case of failures caused by valid scenarios, which out of the control of the app (e.g., a user was excluded
	 * was team admins). As a result, it is possible to get orphaned active webhooks.
	 *
	 * @remarks
	 * Ideally, they can be deleted automatically on the Figma side. However, according to the Figma docs,
	 * "Figma does not currently deactivate endpoints with frequent errors.".
	 *
	 * @see https://www.figma.com/developers/api#webhooks-v2-intro
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	tryDeleteWebhook = async (
		webhookId: string,
		user: ConnectUserInfo,
	): Promise<void> =>
		this.withErrorTranslation(async () => {
			try {
				const { accessToken } = await figmaAuthService.getCredentials(user);
				await figmaClient.deleteWebhook(webhookId, accessToken);
			} catch (e: unknown) {
				// Figma API returns "Not Found" when "webhook does not exist or you do not have permissions to access this webhook".
				// https://www.figma.com/developers/api#webhooks-v2-delete-endpoint
				if (e instanceof NotFoundHttpClientError) {
					getLogger().warn(
						e,
						`Cannot delete the webhook ${webhookId} since it has been already deleted or the user does not permissions.`,
						{ webhookId, user },
					);
					return;
				}

				throw e;
			}
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	getTeamName = async (
		teamId: string,
		user: ConnectUserInfo,
	): Promise<string> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

			const response = await figmaClient.getTeamProjects(teamId, accessToken);
			return response.name;
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private withErrorTranslation = async <T>(fn: () => Promise<T>) => {
		try {
			return await fn();
		} catch (e: unknown) {
			if (
				e instanceof MissingOrInvalidCredentialsFigmaAuthServiceError ||
				e instanceof UnauthorizedHttpClientError ||
				e instanceof ForbiddenHttpClientError
			) {
				throw new UnauthorizedFigmaServiceError(
					'Not allowed to perform the operation.',
					e,
				);
			}

			throw e;
		}
	};
}

export const figmaService = new FigmaService();

export class UnauthorizedFigmaServiceError extends CauseAwareError {}
