import { ForbiddenByFigmaUseCaseError } from './errors';
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

export type AssociateEntityUseCaseParams = {
	readonly entity: {
		readonly url: string;
	};
	readonly associateWith: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const associateEntityUseCase = {
	/**
	 * @throw {ForbiddenByFigmaUseCaseError} Not authorized to access Figma.
	 * @throw {Error} Unknown error.
	 */
	execute: async ({
		entity,
		associateWith,
		atlassianUserId,
		connectInstallation,
	}: AssociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		try {
			const figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(
				entity.url,
			);

			const [design, issue] = await Promise.all([
				figmaService.fetchDesignById(figmaDesignId, {
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
					design,
					connectInstallation,
				),
				figmaService.createDevResourceForJiraIssue({
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
				throw new ForbiddenByFigmaUseCaseError({ cause: e });
			}

			throw e;
		}
	},
};
