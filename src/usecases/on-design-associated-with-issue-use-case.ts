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
			// Consider stop writing to this column.
			// This code is called within the `onEntityAssociated` action, which is asynchronously called when a Design has been associated with an Issue.
			// Therefore, the original input URL is not available in this context.
			// If we need to keep writing to this column, we will need to change the database schema and handle writes partially
			// in the `getEntityByUrl` action and partially in the `onEntityAssociated` action, which can be unnecessary complexity.
			inputUrl: undefined,
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
