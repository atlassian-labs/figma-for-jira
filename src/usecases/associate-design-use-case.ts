import {
	FigmaDesignNotFoundUseCaseResultError,
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
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type AssociateDesignUseCaseParams = {
	readonly designUrl: URL;
	readonly associateWith: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const associateDesignUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 */
	execute: async ({
		designUrl,
		associateWith,
		atlassianUserId,
		connectInstallation,
	}: AssociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		try {
			const figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);

			const [design, issue] = await Promise.all([
				figmaService.getDesignOrParent(figmaDesignId, {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
				jiraService.getIssue(associateWith.id, connectInstallation),
			]);

			if (!design) throw new FigmaDesignNotFoundUseCaseResultError();

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

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}
			if (e instanceof InvalidInputUseCaseResultError) {
				throw new InvalidInputUseCaseResultError(e.message, e);
			}

			throw e;
		}
	},
};
