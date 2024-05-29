import {
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { figmaBackwardIntegrationService } from '../infrastructure';
import {
	figmaBackfillService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';
import { submitFullDesign } from '../jobs';

export type BackfillDesignUseCaseParams = {
	readonly designUrl: URL;
	readonly associateWithIssue: {
		readonly ari: string;
		readonly id: string;
	};
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const backfillDesignUseCase = {
	/**
	 * Backfills designs created via the old "Figma for Jira" experience or the "Jira" widget in Figma.
	 *
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 * @throws {InvalidInputUseCaseResultError} The given design URL is invalid.
	 */
	execute: async ({
		designUrl,
		associateWithIssue,
		atlassianUserId,
		connectInstallation,
	}: BackfillDesignUseCaseParams): Promise<AtlassianDesign> => {
		let figmaDesignId: FigmaDesignIdentifier;
		try {
			figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);
		} catch (e) {
			throw new InvalidInputUseCaseResultError(
				'The given design URL is invalid',
			);
		}

		try {
			const design = figmaBackfillService.buildMinimalDesignFromUrl(designUrl);

			const designIssueAssociation =
				AtlassianAssociation.createDesignIssueAssociation(
					associateWithIssue.ari,
				);

			await jiraService.submitDesign(
				{
					design,
					addAssociations: [designIssueAssociation],
				},
				connectInstallation,
			);

			await Promise.all([
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: associateWithIssue.ari,
					connectInstallationId: connectInstallation.id,
					inputUrl: designUrl.toString(),
				}),
				await figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation(
					{
						originalFigmaDesignId: figmaDesignId,
						design,
						issueId: associateWithIssue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			]);

			// Asynchronously fetch the full design from Figma and backfill it.
			void setImmediate(
				() =>
					void submitFullDesign({
						figmaDesignId,
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					}),
			);

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
