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
import { submitFullDesign } from '../jobs';

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
			const design = figmaBackfillService.buildMinimalDesignFromUrl(designUrl);
			const issue = await jiraService.getIssue(
				associateWith.id,
				connectInstallation,
			);

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
			});

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
