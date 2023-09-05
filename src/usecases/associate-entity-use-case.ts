import type { AtlassianDesign } from '../domain/entities';
import { AtlassianDesignAssociation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';

export type AssociateWith = {
	readonly ari: string;
	readonly cloudId: string;
	readonly type: string;
	readonly id: string | number;
};

export type AssociateEntityUseCaseParams = {
	readonly entity: {
		readonly url: string;
	};
	readonly associateWith: AssociateWith;
	readonly atlassianUserId: string;
};

export const associateEntityUseCase = {
	execute: async ({
		entity,
		associateWith,
		atlassianUserId,
	}: AssociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		const design = await figmaService.fetchDesign(entity.url, atlassianUserId);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const association = AtlassianDesignAssociation.withJiraIssue(
			associateWith.ari,
		);

		// TODO: Call Jira to ingest entity
		// const connectInstallation =
		// 	await connectInstallationRepository.getByClientKey('CLIENT_KEY');
		// await jiraService.submitDesign(
		// 	{
		// 		design,
		// 		addAssociations: [association],
		// 	},
		// 	connectInstallation,
		// );

		// TODO: Phone home to Figma /dev_resources endpoint
		// const jiraIssue = await jiraService.getIssue('ISSUE_KEY', connectInstallation);

		return design;
	},
};
