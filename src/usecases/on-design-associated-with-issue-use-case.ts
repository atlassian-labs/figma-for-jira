import { InvalidInputUseCaseResultError } from './errors';

import type { ConnectInstallation } from '../domain/entities';
import { FigmaDesignIdentifier } from '../domain/entities';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

type OnDesignAssociatedWithIssueUseCaseParams = {
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
			inputUrl: undefined, // Stop writing to this column. Consider dropping it when the data is not required anymore.
		});

		await figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
			{
				figmaDesignId,
				issueId: params.issue.id,
				atlassianUserId: params.atlassianUserId,
				connectInstallation: params.connectInstallation,
			},
		);
	},
};
