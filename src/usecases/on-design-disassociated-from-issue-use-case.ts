import { InvalidInputUseCaseResultError } from './errors';

import type { ConnectInstallation } from '../domain/entities';
import { FigmaDesignIdentifier } from '../domain/entities';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

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
	},
};
