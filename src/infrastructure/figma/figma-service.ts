import type {
	PostWebhookRequestBody,
	PostWebhookResponse,
} from '@figma/rest-api-spec';

import {
	figmaAuthService,
	MissingOrInvalidCredentialsFigmaAuthServiceError,
} from './figma-auth-service';
import type { GetFileMetaResponse, GetFileResponse } from './figma-client';
import { figmaClient } from './figma-client';
import { ERROR_RESPONSE_SCHEMA } from './figma-client/schemas';
import {
	transformFileMetaToAtlassianDesign,
	transformFileToAtlassianDesign,
	tryTransformNodeToAtlassianDesign,
} from './transformers';

import { CauseAwareError } from '../../common/errors';
import { isNotNullOrUndefined } from '../../common/predicates';
import { isOfSchema } from '../../common/schema-validation';
import { isString } from '../../common/string-utils';
import { tryParseUrl } from '../../common/url-utils';
import { buildAppUrl } from '../../config';
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
				return {
					id: meResponse.id,
					email: meResponse.email,
				};
			});
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) return null;
			throw e;
		}
	};

	/**
	 * Returns Atlassian design for the Figma design with the given ID if it exists; otherwise -- `null`.
	 *
	 * @throws {InvalidInputFigmaServiceError} Invalid node ids specified.
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	getDesign = async (
		designId: FigmaDesignIdentifier,
		user: ConnectUserInfo,
	): Promise<AtlassianDesign | null> =>
		this.withErrorTranslation(async () => {
			const credentials = await figmaAuthService.getCredentials(user);

			const { fileKey, nodeId } = designId;

			if (!nodeId) {
				return await this.getDesignForFile(fileKey, credentials);
			} else {
				return await this.getDesignForNode(fileKey, nodeId, credentials);
			}
		});

	/**
	 * Returns Atlassian design for the Figma design with the given ID. If the design
	 * for the given ID doesn't exist, returns the parent design identified by the
	 * fileKey part of the design ID. If the parent design does not exist, returns `null`.
	 *
	 * @throws {InvalidInputFigmaServiceError} Invalid node ids specified.
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	getDesignOrParent = async (
		designId: FigmaDesignIdentifier,
		user: ConnectUserInfo,
	): Promise<AtlassianDesign | null> =>
		this.withErrorTranslation(async () => {
			const credentials = await figmaAuthService.getCredentials(user);

			const { fileKey, nodeId } = designId;

			if (!nodeId) {
				return this.getDesignForFile(fileKey, credentials);
			} else {
				return this.getDesignForNodeOrFile(fileKey, nodeId, credentials);
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
	 * @throws {InvalidInputFigmaServiceError} Invalid node ids specified.
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
			let fileMetaResponse: GetFileMetaResponse;

			try {
				const nodeIds = designIds.map((id) => id.nodeId).filter(isString);
				[fileResponse, fileMetaResponse] = await Promise.all([
					figmaClient.getFile(
						fileKey,
						{
							ids: nodeIds,
							// If there is at least 1 node, use `depth=0` to exclude children and, therefore, avoid a massive response payload and high network latency.
							// If there is no node, `depth=0` is considered invalid -- use `depth=1` instead.
							depth: nodeIds.length ? 0 : 1,
							node_last_modified: true,
						},
						accessToken,
					),
					figmaClient.getFileMeta(fileKey, accessToken),
				]);
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
							fileMetaResponse,
						});
					} else {
						return tryTransformNodeToAtlassianDesign({
							fileKey: designId.fileKey,
							nodeId: designId.nodeId,
							fileResponse,
							fileMetaResponse,
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
			url: URL;
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
							url: issue.url.toString(),
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
	 * Deletes the Figma dev resource from the design with given ID.
	 *
	 * The deletion is performed on a best-efforts basis: if the design is not found or
	 * unavailable for the user, no error is thrown.
	 */
	tryDeleteDevResource = async ({
		designId,
		devResourceUrl,
		user,
	}: {
		designId: FigmaDesignIdentifier;
		devResourceUrl: URL;
		user: ConnectUserInfo;
	}): Promise<void> => {
		try {
			const { accessToken } = await figmaAuthService.getCredentials(user);

			const { dev_resources } = await figmaClient.getDevResources({
				fileKey: designId.fileKey,
				nodeIds: [designId.nodeIdOrDefaultDocumentId],
				accessToken,
			});

			const devResourceToDelete = dev_resources.find(
				(devResource) =>
					tryParseUrl(devResource.url)?.toString() ===
					devResourceUrl.toString(),
			);

			if (!devResourceToDelete) {
				getLogger().info(
					`No matching dev resource found to delete for file ${designId.fileKey} and node ${designId.nodeId}`,
				);
				return;
			}

			await figmaClient.deleteDevResource({
				fileKey: designId.fileKey,
				devResourceId: devResourceToDelete.id,
				accessToken,
			});
		} catch (e) {
			if (
				e instanceof MissingOrInvalidCredentialsFigmaAuthServiceError ||
				e instanceof UnauthorizedHttpClientError ||
				e instanceof ForbiddenHttpClientError ||
				e instanceof NotFoundHttpClientError
			) {
				getLogger().error(e, 'Failed to delete the Figma dev resource.');
				return;
			}

			throw e;
		}
	};

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

			const request: PostWebhookRequestBody = {
				event_type: 'FILE_UPDATE',
				context: 'team',
				context_id: teamId,
				endpoint: buildAppUrl('figma/webhook').toString(),
				passcode,
				description: 'Figma for Jira Cloud',
			};

			try {
				const result = await figmaClient.createWebhook(request, accessToken);
				return { webhookId: result.id, teamId: result.context_id };
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
	 * Creates a FILE_UPDATE webhook and a DEV_MODE_STATUS_UPDATE webhook for the provided file.
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 * @throws {PaidPlanRequiredFigmaServiceError} A Figma paid plan is required to perform this operation.
	 */
	createFileContextWebhooks = async (
		fileKey: string,
		passcode: string,
		user: ConnectUserInfo,
	): Promise<{
		fileWebhook: PostWebhookResponse;
		devModeStatusUpdateWebhook: PostWebhookResponse;
	}> =>
		this.withErrorTranslation(async () => {
			const { accessToken } = await figmaAuthService.getCredentials(user);

			const fileUpdateRequest: PostWebhookRequestBody = {
				event_type: 'FILE_UPDATE',
				context: 'file',
				context_id: fileKey,
				endpoint: buildAppUrl('figma/webhook').toString(),
				passcode,
				description: 'Figma for Jira Cloud',
			};

			const devModeStatusUpdateRequest: PostWebhookRequestBody = {
				...fileUpdateRequest,
				event_type: 'DEV_MODE_STATUS_UPDATE',
			};

			try {
				const [fileWebhook, devModeStatusUpdateWebhook] = await Promise.all([
					figmaClient.createWebhook(fileUpdateRequest, accessToken),
					figmaClient.createWebhook(devModeStatusUpdateRequest, accessToken),
				]);

				return {
					fileWebhook,
					devModeStatusUpdateWebhook,
				};
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

			try {
				const response = await figmaClient.getTeamProjects(teamId, accessToken);
				return response.name;
			} catch (e) {
				if (
					e instanceof BadRequestHttpClientError &&
					isOfSchema(e.response, ERROR_RESPONSE_SCHEMA)
				) {
					throw new InvalidInputFigmaServiceError(e.response.message, e);
				}

				throw e;
			}
		});

	/**
	 * Returns Atlassian design representation for the given Figma File if it exists; otherwise -- `null`.
	 *
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private getDesignForFile = async (
		fileKey: string,
		credentials: FigmaOAuth2UserCredentials,
	): Promise<AtlassianDesign | null> =>
		this.withErrorTranslation(async () => {
			try {
				// Use File Metadata API for better performance.
				const fileMetaResponse = await figmaClient.getFileMeta(
					fileKey,
					credentials.accessToken,
				);
				return transformFileMetaToAtlassianDesign({
					fileKey,
					fileMetaResponse,
				});
			} catch (e) {
				if (e instanceof NotFoundHttpClientError) return null;
				throw e;
			}
		});

	/**
	 * Returns Atlassian design representation for the given Figma Node if it exists; otherwise -- `null`.
	 *
	 * @throws {InvalidInputFigmaServiceError} Invalid node ids specified.
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private getDesignForNode = async (
		fileKey: string,
		nodeId: string,
		credentials: FigmaOAuth2UserCredentials,
	): Promise<AtlassianDesign | null> =>
		this.withErrorTranslation(async () => {
			try {
				const [fileResponse, fileMetaResponse] = await Promise.all([
					figmaClient.getFile(
						fileKey,
						{
							ids: [nodeId],
							depth: 0, // Exclude children of the target node to avoid a massive response payload and high network latency.
							node_last_modified: true,
						},
						credentials.accessToken,
					),
					figmaClient.getFileMeta(fileKey, credentials.accessToken),
				]);

				return tryTransformNodeToAtlassianDesign({
					fileKey,
					nodeId,
					fileResponse,
					fileMetaResponse,
				});
			} catch (e) {
				if (e instanceof NotFoundHttpClientError) return null;
				throw e;
			}
		});

	/**
	 * Returns Atlassian design representation for the given Figma Node if it exists; Figma File if Node does not exist;
	 * otherwise -- `null`.
	 *
	 * @throws {InvalidInputFigmaServiceError} Invalid node ids specified.
	 * @throws {UnauthorizedFigmaServiceError} Not authorized to access Figma.
	 */
	private getDesignForNodeOrFile = async (
		fileKey: string,
		nodeId: string,
		credentials: FigmaOAuth2UserCredentials,
	): Promise<AtlassianDesign | null> =>
		this.withErrorTranslation(async () => {
			try {
				const [fileResponse, fileMetaResponse] = await Promise.all([
					figmaClient.getFile(
						fileKey,
						{
							ids: [nodeId],
							depth: 0, // Exclude children of the target node to avoid a massive response payload and high network latency.
							node_last_modified: true,
						},
						credentials.accessToken,
					),
					figmaClient.getFileMeta(fileKey, credentials.accessToken),
				]);

				let design = tryTransformNodeToAtlassianDesign({
					fileKey,
					nodeId,
					fileResponse,
					fileMetaResponse,
				});

				design ??= transformFileToAtlassianDesign({
					fileKey,
					fileResponse,
					fileMetaResponse,
				});

				return design;
			} catch (e) {
				if (e instanceof NotFoundHttpClientError) return null;
				throw e;
			}
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

			if (e instanceof BadRequestHttpClientError) {
				const response = e.response;
				if (
					typeof response === 'object' &&
					response != null &&
					'err' in response &&
					typeof response.err === 'string'
				) {
					throw new InvalidInputFigmaServiceError(response.err, e);
				}
			}

			throw e;
		}
	};
}

export const figmaService = new FigmaService();

export class UnauthorizedFigmaServiceError extends CauseAwareError {}

export class PaidPlanRequiredFigmaServiceError extends CauseAwareError {}

export class InvalidInputFigmaServiceError extends CauseAwareError {}
