import {
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';
import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	buildJiraIssueUrl,
	FigmaDesignIdentifier,
} from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { figmaBackfillService } from '../infrastructure/figma/figma-backfill-service';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type BackfillDesignUseCaseParams = {
	readonly designUrl: URL;
	readonly associateWith: AtlassianEntity;
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
		associateWith,
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
			const existingAssociatedFigmaDesign =
				await associatedFigmaDesignRepository.findByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					figmaDesignId,
					associateWith.ari,
					connectInstallation.id,
				);

			// eslint-disable-next-line prefer-const
			let [design, issue] = await Promise.all([
				figmaService.getDesignOrParent(
					figmaDesignId,
					{
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					},
					existingAssociatedFigmaDesign,
				),
				jiraService.getIssue(associateWith.id, connectInstallation),
			]);

			// If a design is not found, it either has been deleted or a user does not have access to the design.
			// In order to backfill deleted/unavailable designs, try to build the design from the URL as a fallback.
			// Once the design is backfilled, a user can decide what to do with it (e.g., keep or unlink them).
			design ??= figmaBackfillService.buildMinimalDesignFromUrl(designUrl);

			const designIssueAssociation =
				AtlassianAssociation.createDesignIssueAssociation(associateWith.ari);

			await Promise.all([
				jiraService.submitDesign(
					{
						design,
						addAssociations: [designIssueAssociation],
					},
					connectInstallation,
				),
				jiraService.saveDesignUrlInIssueProperties(
					issue.id,
					figmaDesignId,
					design,
					connectInstallation,
				),
				figmaService.tryCreateDevResourceForJiraIssue({
					designId: figmaDesignId,
					issue: {
						url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
						key: issue.key,
						title: issue.fields.summary,
					},
					user: {
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					},
				}),
			]);

			await associatedFigmaDesignRepository.upsert({
				designId: figmaDesignId,
				associatedWithAri: associateWith.ari,
				connectInstallationId: connectInstallation.id,
				inputUrl: designUrl.toString(),
				devStatus: design.status,
				lastUpdated: design.lastUpdated,
			});

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
