import type { AtlassianDesign } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import type { AssociateEntityPayload } from '../web/routes/entities';

export const associateEntityUseCase = {
	execute: async ({
		entity: { url },
		associateWith,
		atlassianUserId,
	}: AssociateEntityPayload & {
		atlassianUserId: string;
	}): Promise<AtlassianDesign> => {
		const design = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		// TODO: Call Jira to ingest entity
		// const connectInstallation =
		// 	await connectInstallationRepository.getByClientKey('CLIENT_KEY');
		// await jiraService.submitDesign(design);

		// TODO: Phone home to Figma /dev_resources endpoint
		// const jiraIssue = await jiraService.getIssue('ISSUE_KEY');

		return design;
	},
};
