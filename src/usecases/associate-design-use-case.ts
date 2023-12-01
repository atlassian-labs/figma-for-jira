import {
	FigmaDesignNotFoundUseCaseResultError,
	ForbiddenByFigmaUseCaseResultError,
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
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type AssociateDesignUseCaseParams = {
	readonly entity: {
		readonly url: string;
	};
	readonly associateWith: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export class AssociateDesignUseCase {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 */
	execute = async ({
		entity,
		associateWith,
		atlassianUserId,
		connectInstallation,
	}: AssociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		try {
			const designUrl = new URL(entity.url);
			const figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			// eslint-disable-next-line prefer-const
			let [design, issue] = await Promise.all([
				figmaService.getDesignOrParent(figmaDesignId, {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
				jiraService.getIssue(associateWith.id, connectInstallation),
			]);

			if (!design) {
				// If design is not found, it either has been deleted or a user does not have
				// access to this design.
				if (this.isDesignForBackfill(designUrl)) {
					// For the "Backfill" operation, try to build the design from the URL as a fallback.
					// Therefore, deleted/unavailable designs can still be migrated to the new experience.
					// Then, a user can decide what to do with them after backfill (e.g., to keep or unlink them).
					design = figmaService.buildMinimalDesignFromUrl(designUrl);
				} else {
					// For a normal "Associate" operation, throw an error since users should not associate deleted or
					// unavailable designs.
					throw new FigmaDesignNotFoundUseCaseResultError();
				}
			}

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
			});

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	};

	/**
	 * Returns a flag indicating whether the design is associated within the backfill process.
	 *
	 * The design is considered for backfill if it contains a special query parameter (`com.atlassian.designs.backfill`).
	 *
	 * @remarks
	 * Jira Frontend appends an additional query parameter to the design URL as a temporary workaround that allows to
	 * distinguish "Backfill" from normal "Associate" operations. Therefore, the app can apply some special considerations
	 * to designs for backfill (e.g., handle deleted designs).
	 */
	private isDesignForBackfill = (url: URL): boolean => {
		return url.searchParams.has(
			'com.atlassian.figma-for-jira.backfill',
			'true',
		);
	};
}

export const associateDesignUseCase = new AssociateDesignUseCase();
