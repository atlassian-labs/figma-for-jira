import { getLogger } from '../../infrastructure';
import { figmaService } from '../../infrastructure/figma';
import { AssociateEntityPayload } from '../../web/routes/entities';

export const associateEntityUseCase = {
	execute: async ({
		entity: { url },
		associateWith,
		atlassianUserId,
	}: AssociateEntityPayload & { atlassianUserId: string }) => {
		// 1. Fetch an entity from Figma, using figma service
		const designEntity = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		getLogger().debug(designEntity, 'Successfully fetched design entity');
		// 2. Call Data Depot to ingest entity
		// 3. Phone home to Figma
	},
};
