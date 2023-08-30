import { DataDepotDesign } from '../domain/entities/design';
import { figmaService } from '../infrastructure/figma';
import { AssociateEntityPayload } from '../web/routes/entities';

export const associateEntityUseCase = {
	execute: async ({
		entity: { url },
		associateWith,
		atlassianUserId,
	}: AssociateEntityPayload & {
		atlassianUserId: string;
	}): Promise<DataDepotDesign> => {
		const designEntity = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		// TODO: Call Jira to ingest entity to Data Depot
		// TODO: Phone home to Figma /dev_resources endpoint
		return designEntity;
	},
};
