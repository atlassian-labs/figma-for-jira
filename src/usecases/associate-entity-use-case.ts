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
		const designEntity = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		// TODO: Call Jira to ingest entity
		// TODO: Phone home to Figma /dev_resources endpoint
		return designEntity;
	},
};
