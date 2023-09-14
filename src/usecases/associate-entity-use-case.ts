import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import { AtlassianAssociation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { buildIssueUrl, jiraService } from '../infrastructure/jira';

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
		const [design, issue] = await Promise.all([
			figmaService.fetchDesignByUrl(entity.url, atlassianUserId),
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
				designUrl: entity.url,
				issueUrl: buildIssueUrl(connectInstallation.baseUrl, issueKey),
				issueKey,
				issueTitle: fields.summary,
				atlassianUserId,
			}),
		]);

		return design;
	},
};
