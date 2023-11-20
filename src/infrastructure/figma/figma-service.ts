import {
	figmaAuthService,
	MissingOrInvalidCredentialsFigmaAuthServiceError,
} from './figma-auth-service';
import type { CreateWebhookRequest, GetFileResponse } from './figma-client';
import { figmaClient } from './figma-client';
import { ERROR_RESPONSE_SCHEMA } from './figma-client/schemas';
import {
	transformFileMetaToAtlassianDesign,
	transformFileToAtlassianDesign,
	transformNodeToAtlassianDesign,
	tryTransformNodeToAtlassianDesign,
} from './transformers';

import { CauseAwareError } from '../../common/errors';
import { isNotNullOrUndefined } from '../../common/predicates';
import { isOfSchema } from '../../common/schema-validation';
import { isString } from '../../common/string-utils';
import { getConfig } from '../../config';
import type {
	AtlassianDesign,
	ConnectUserInfo,
	FigmaDesignIdentifier,
	FigmaOAuth2UserCredentials,
	FigmaUser,
} from '../../domain/entities';
import {
	BadRequestHttpClientError,
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
	UnauthorizedHttpClientError,
} from '../http-client-errors';
import { getLogger } from '../logger';

export class FigmaService {
	/**
	 * Returns the user that authorized the app to access Figma and null if the user is not authorized.
	 */
	getCurrentUser = async (user: ConnectUserInfo): Promise<FigmaUser | null> => {
		try {
			return await this.withErrorTranslation(async () => {
				const credentials = await figmaAuthService.getCredentials(user);
				const meResponse = await figmaClient.me(credentials.accessToken);
				return { email: meResponse.email };
			});
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) return null;
			throw e;
		}
	};

	/**
	 * Return Atlassian design for the Figma design with the given ID.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	getDesign = async (
		designId: FigmaDesignIdentifier,
		user: ConnectUserInfo,
	): Promise<AtlassianDesign> =>
		this.withErrorTranslation(async () => {
			const credentials = await figmaAuthService.getCredentials(user);

			const { fileKey, nodeId } = designId;

			if (!nodeId) {
				return this.getDesignForFile(fileKey, credentials);
			} else {
				return this.getDesignForNode(fileKey, nodeId, credentials);
			}
		});

	/**
	 * Returns available Atlassian designs for Figma designs with the given IDs.
	 * IDs should point out to a Figma File or Nodes within the same File.
	 *
	 * If some Figma designs are not available (e.g., some Nodes were deleted),
	 * the returned array will not include designs for these Nodes.
	 *
	 * @remarks
	 * Can be used to efficiently fetch multiple designs within the same file (e.g, a File-based design and multiple
	 * Node-based designs). The method sends a single request to Figma API to retrieve minimal required data at once.
	 *
	 * @param designIds IDs of designs within the same Figma file.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	getAvailableDesignsFromSameFile = async (
		designIds: FigmaDesignIdentifier[],
		user: ConnectUserInfo,
	): Promise<AtlassianDesign[]> =>
		this.withErrorTranslation(async () => {
			if (!designIds.length) return [];

			// Ensure all design identifiers have the same file key
			const fileKey = designIds[0].fileKey;
			const sameFileKey = designIds.every(
				(designId) => designId.fileKey === fileKey,
			);

			if (!sameFileKey) {
				throw new Error('designIds must all have the same fileKey');
			}

			const { accessToken } = await figmaAuthService.getCredentials(user);
			let fileResponse: GetFileResponse;

			try {
				fileResponse = await figmaClient.getFile(
					fileKey,
					{
						ids: designIds.map((id) => id.nodeId).filter(isString),
						depth: 0, // Exclude children of the target nodes(s) to avoid a massive response payload and high network latency.
						node_last_modified: true,
					},
					accessToken,
				);
			} catch (e) {
				if (e instanceof NotFoundHttpClientError) return [];
				throw e;
			}

			return designIds
				.map((designId) => {
					if (!designId.nodeId) {
						return transformFileToAtlassianDesign({
							fileKey: designId.fileKey,
							fileResponse,
						});
					} else {
						return tryTransformNodeToAtlassianDesign({
							fileKey: designId.fileKey,
							nodeId: designId.nodeId,
							fileResponse,
						});
					}
				})
				.filter(isNotNullOrUndefined);
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	tryCreateDevResourceForJiraIssue = async ({
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
							name: `[${issue.key}] ${issue.title}`,
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
					'Failed to create Figma dev resources.',
				);
			}
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	deleteDevResource = async ({
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
				nodeIds: [designId.nodeIdOrDefaultDocumentId],
				accessToken,
			});

			const devResourceToDelete = dev_resources.find(
				(devResource) => devResource.url === devResourceUrl,
			);

			if (!devResourceToDelete) {
				getLogger().info(
					`No matching dev resource found to delete for file ${designId.fileKey} and node ${designId.nodeId}`,
				);
				return;
			}

			try {
				await figmaClient.deleteDevResource({
					fileKey: designId.fileKey,
					devResourceId: devResourceToDelete.id,
					accessToken,
				});
			} catch (e) {
				if (e instanceof NotFoundHttpClientError) return;
				throw e;
			}
		});

	/**
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 * @throws {PaidPlanRequiredFigmaServiceError} A Figma paid plan is required to perform this operation.
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

			try {
				const result = await figmaClient.createWebhook(request, accessToken);
				return { webhookId: result.id, teamId: result.team_id };
			} catch (e: unknown) {
				if (
					e instanceof BadRequestHttpClientError &&
					isOfSchema(e.response, ERROR_RESPONSE_SCHEMA)
				) {
					// Figma allows to create webhooks only on paid plans.
					// See https://www.figma.com/pricing/.
					if (e.response.message == 'Access Denied') {
						throw new PaidPlanRequiredFigmaServiceError(
							'A Figma paid plan is required to perform this operation.',
							e,
						);
					}
				}

				throw e;
			}
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
	 * Return Atlassian design representation for the given Figma File.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private getDesignForFile = async (
		fileKey: string,
		credentials: FigmaOAuth2UserCredentials,
	): Promise<AtlassianDesign> => {
		// Use File Metadata API for better performance.
		const fileMetaResponse = await figmaClient.getFileMeta(
			fileKey,
			credentials.accessToken,
		);
		return transformFileMetaToAtlassianDesign({
			fileKey,
			fileMetaResponse,
		});
	};

	/**
	 * Return Atlassian design representation for the given Figma Node.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private getDesignForNode = async (
		fileKey: string,
		nodeId: string,
		credentials: FigmaOAuth2UserCredentials,
	): Promise<AtlassianDesign> => {
		const fileResponse = await figmaClient.getFile(
			fileKey,
			{
				ids: [nodeId],
				depth: 0, // Exclude children of the target node to avoid a massive response payload and high network latency.
				node_last_modified: true,
			},
			credentials.accessToken,
		);

		return transformNodeToAtlassianDesign({
			fileKey,
			nodeId,
			fileResponse,
		});
	};

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

export class PaidPlanRequiredFigmaServiceError extends CauseAwareError {}
