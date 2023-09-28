import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	buildJiraIssueUrl,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
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
	execute: async ({
		entity,
		associateWith,
		atlassianUserId,
		connectInstallation,
	}: AssociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		const figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(entity.url);

		const [design, issue] = await Promise.all([
			figmaService.fetchDesignById(figmaDesignId, atlassianUserId),
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
				atlassianUserId,
			}),
		]);

		await associatedFigmaDesignRepository.upsert({
			designId: figmaDesignId,
			associatedWithAri: associateWith.ari,
			connectInstallationId: connectInstallation.id,
		});

		return design;
	},
};
