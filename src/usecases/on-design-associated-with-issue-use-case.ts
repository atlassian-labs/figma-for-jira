import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';

import { getFeatureFlag, getLDClient } from '../config/launch_darkly';
import type {
	ConnectInstallation,
	FigmaFileWebhookCreateParams,
} from '../domain/entities';
import {
	FigmaDesignIdentifier,
	FigmaFileWebhookEventType,
} from '../domain/entities';
import {
	figmaBackwardIntegrationServiceV2,
	getLogger,
} from '../infrastructure';
import {
	figmaService,
	PaidPlanRequiredFigmaServiceError,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';
import { figmaFileWebhookRepository } from '../infrastructure/repositories/figma-file-webhook-repository';

export type OnDesignAssociatedWithIssueUseCaseParams = {
	readonly design: {
		readonly ari: string;
		readonly id: string;
	};
	readonly issue: {
		readonly ari: string;
		readonly id: string;
	};
	readonly atlassianUserId?: string;
	readonly connectInstallation: ConnectInstallation;
};

export const onDesignAssociatedWithIssueUseCaseParams = {
	/**
	 * @throws {InvalidInputUseCaseResultError} The given design ID has the unexpected format.
	 */
	execute: async (
		params: OnDesignAssociatedWithIssueUseCaseParams,
	): Promise<void> => {
		let figmaDesignId: FigmaDesignIdentifier;
		try {
			figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
				params.design.id,
			);
		} catch (e) {
			throw new InvalidInputUseCaseResultError(
				'The given design ID has the unexpected format.',
			);
		}

		await associatedFigmaDesignRepository.upsert({
			designId: figmaDesignId,
			associatedWithAri: params.issue.ari,
			connectInstallationId: params.connectInstallation.id,
			// Consider stop writing to this column.
			// This code is called within the `onEntityAssociated` action, which is asynchronously called when a Design has been associated with an Issue.
			// Therefore, the original input URL is not available in this context.
			// If we need to keep writing to this column, we will need to change the database schema and handle writes partially
			// in the `getEntityByUrl` action and partially in the `onEntityAssociated` action, which can be unnecessary complexity.
			inputUrl: undefined,
		});

		await figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue({
			figmaDesignId,
			issueId: params.issue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation: params.connectInstallation,
		});

		if (params.atlassianUserId) {
			await maybeCreateFigmaFileWebhooks(
				figmaDesignId.fileKey,
				params.atlassianUserId,
				params.connectInstallation.id,
			);
		} else {
			getLogger().warn(
				`[OnDesignAssociatedWithIssueUseCase] No atlassianUserId provided for design association with issue ${params.issue.ari}. Skipping file webhooks creation.`,
			);
		}
	},
};

async function maybeCreateFigmaFileWebhooks(
	fileKey: string,
	atlassianUserId: string,
	connectInstallationId: string,
): Promise<void> {
	const ldClient = await getLDClient();
	const useFileWebhooks = await getFeatureFlag(
		ldClient,
		'ext_figma_for_jira_use_file_webhooks',
		false,
	);

	if (!useFileWebhooks) {
		return;
	}

	const existingWebhooks =
		await figmaFileWebhookRepository.findManyByFileKeyAndConnectInstallationId(
			fileKey,
			connectInstallationId,
		);
	if (existingWebhooks.length > 0) {
		return;
	}

	try {
		const webhookPasscode = uuidv4();
		const { fileWebhook, devModeStatusUpdateWebhook } =
			await figmaService.createFileContextWebhooks(fileKey, webhookPasscode, {
				atlassianUserId,
				connectInstallationId,
			});

		const upsertParams: Omit<
			FigmaFileWebhookCreateParams,
			'webhookId' | 'eventType'
		> = {
			fileKey,
			webhookPasscode,
			createdBy: {
				connectInstallationId,
				atlassianUserId,
			},
		};

		await Promise.all([
			figmaFileWebhookRepository.upsert({
				...upsertParams,
				webhookId: fileWebhook.id,
				eventType: FigmaFileWebhookEventType.FILE_UPDATE,
			}),
			figmaFileWebhookRepository.upsert({
				...upsertParams,
				webhookId: devModeStatusUpdateWebhook.id,
				eventType: FigmaFileWebhookEventType.DEV_MODE_STATUS_UPDATE,
			}),
		]);
	} catch (e) {
		if (e instanceof UnauthorizedFigmaServiceError) {
			getLogger().warn(
				`[OnDesignAssociatedWithIssueUseCase] Failed to create file webhooks for design. User does not have permission to create file webhooks.`,
			);

			return;
		}

		if (e instanceof PaidPlanRequiredFigmaServiceError) {
			getLogger().warn(
				`[OnDesignAssociatedWithIssueUseCase] Failed to create file webhooks for design. User is not on a paid plan.`,
			);

			return;
		}

		throw e;
	}
}
