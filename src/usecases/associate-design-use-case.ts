import { ForbiddenByFigmaUseCaseResultError } from './errors';
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

export const associateDesignUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 */
	execute: async ({
		entity,
		associateWith,
		atlassianUserId,
		connectInstallation,
	}: AssociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		try {
			const figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(
				entity.url,
			);

			const [design, issue] = await Promise.all([
				figmaService.getDesignOrParent(figmaDesignId, {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
				jiraService.getIssue(associateWith.id, connectInstallation),
			]);

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
	},
};
