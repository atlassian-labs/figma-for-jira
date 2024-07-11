import { InvalidInputUseCaseResultError } from './errors';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import { FigmaDesignIdentifier } from '../domain/entities';
import { figmaBackfillService } from '../infrastructure/figma';
import { submitFullDesign } from '../jobs';

export type GetDesignByUrlForBackfillUseCaseParams = {
	readonly designUrl: URL;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const getDesignByUrlForBackfillUseCase = {
	/**
	 * Returns {@link AtlassianDesign} for the given Figma URL within the backfill process.
	 *
	 * The backfill is required for designs linked to a Jira Issue via the old "Figma for Jira" experience
	 * or the "Jira" widget in Figma. It can be triggered from a Jira Issue view.
	 *
	 * Due to a high latency of fetching large Figma Files and therefore, a risk of timeout errors,
	 * return a minimal design constructed from the given URL and then submit the full design asynchronously.
	 *
	 * @throws {InvalidInputUseCaseResultError} The given design URL is invalid.
	 */
	execute: async ({
		designUrl,
		atlassianUserId,
		connectInstallation,
	}: GetDesignByUrlForBackfillUseCaseParams): Promise<AtlassianDesign> => {
		let figmaDesignId: FigmaDesignIdentifier;
		try {
			figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);
		} catch (e) {
			throw new InvalidInputUseCaseResultError(
				'The given design URL is invalid',
			);
		}

		const design = figmaBackfillService.buildMinimalDesignFromUrl(designUrl);

		// Asynchronously fetch the full design from Figma and backfill it.
		void setImmediate(
			() =>
				void submitFullDesign({
					figmaDesignId,
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
		);

		return Promise.resolve(design);
	},
};
