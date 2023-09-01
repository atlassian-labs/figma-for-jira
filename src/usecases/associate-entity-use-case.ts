import { AtlassianDesign } from '../domain/entities/design';
import { getLogger } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import { AssociateEntityPayload } from '../web/routes/entities';

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
		await figmaService.createDevResource(url, atlassianUserId, associateWith);
		return designEntity;
	},
};
