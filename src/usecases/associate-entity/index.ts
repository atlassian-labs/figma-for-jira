import { getLogger } from '../../infrastructure';
import { figmaService } from '../../infrastructure/figma';
import { AssociateEntityPayload } from '../../web/routes/entities';

export const associateEntityUseCase = {
	execute: async ({
		entity: { url },
		associateWith,
		atlassianUserId,
	}: AssociateEntityPayload & { atlassianUserId: string }) => {
		const designEntity = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		getLogger().debug(designEntity, 'Successfully fetched design entity');
		// TODO: Call Jira to ingest entity to Data Depot
		// TODO: Phone home to Figma /dev_resources endpoint
	},
};
