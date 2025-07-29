import { InvalidInputUseCaseResultError } from './errors';

import { getFeatureFlag, getLDClient } from '../config/launch_darkly';
import type { ConnectInstallation } from '../domain/entities';
import { FigmaDesignIdentifier } from '../domain/entities';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import {
	associatedFigmaDesignRepository,
	figmaFileWebhookRepository,
} from '../infrastructure/repositories';

export type OnDesignDisassociatedFromIssueUseCaseParams = {
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

export const onDesignDisassociatedFromIssueUseCase = {
	/**
	 * @throws {InvalidInputUseCaseResultError} The given design ID has the unexpected format.
	 */
	execute: async (
		params: OnDesignDisassociatedFromIssueUseCaseParams,
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

		await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
			figmaDesignId,
			params.issue.ari,
			params.connectInstallation.id,
		);

		await figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue({
			figmaDesignId,
			issueId: params.issue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation: params.connectInstallation,
		});

		await maybeTryDeleteFigmaFileWebhooks(
			figmaDesignId,
			params.connectInstallation.id,
		);
	},
};

async function maybeTryDeleteFigmaFileWebhooks(
	figmaDesignId: FigmaDesignIdentifier,
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

	const associatedDesigns =
		await associatedFigmaDesignRepository.findManyByFileKeyAndConnectInstallationId(
			figmaDesignId.fileKey,
			connectInstallationId,
		);

	// if we no longer have any linked designs that rely on these webhooks, delete them
	if (associatedDesigns.length === 0) {
		const fileWebhooks =
			await figmaFileWebhookRepository.findManyByFileKeyAndConnectInstallationId(
				figmaDesignId.fileKey,
				connectInstallationId,
			);

		await Promise.all(
			fileWebhooks.map(async (webhook) => {
				await figmaService.tryDeleteWebhook(
					webhook.webhookId,
					webhook.creatorInfo,
				);
				await figmaFileWebhookRepository.delete(webhook.id);
			}),
		);
	}
}
