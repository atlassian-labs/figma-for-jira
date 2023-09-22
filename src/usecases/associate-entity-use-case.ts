import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { buildIssueUrl, jiraService } from '../infrastructure/jira';
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

		const { key: issueKey, fields, id: issueId } = issue;

		await Promise.all([
			jiraService.submitDesign(
				{
					design,
					addAssociations: [designIssueAssociation],
				},
				connectInstallation,
			),
			jiraService.saveDesignUrlInIssueProperties(
				issueId,
				design,
				connectInstallation,
			),
			figmaService.createDevResource({
				designId: figmaDesignId,
				issueUrl: buildIssueUrl(connectInstallation.baseUrl, issueKey),
				issueKey,
				issueTitle: fields.summary,
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
