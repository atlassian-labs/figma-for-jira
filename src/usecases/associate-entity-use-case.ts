import { AtlassianDesign } from '../domain/entities/design';
import { figmaService } from '../infrastructure/figma';

type Entity = {
	readonly url: string;
};

export type AssociateWith = {
	readonly ari: string;
	readonly cloudId: string;
	readonly type: string;
	readonly id: string | number;
};

export type AssociateEntityUseCaseParams = {
	readonly entity: Entity;
	readonly associateWith: AssociateWith;
};

export const associateEntityUseCase = {
	execute: async ({
		entity: { url },
		associateWith,
		atlassianUserId,
	}: AssociateEntityUseCaseParams & {
		atlassianUserId: string;
	}): Promise<AtlassianDesign> => {
		const designEntity = await figmaService.fetchDesign(
			url,
			atlassianUserId,
			associateWith,
		);
		// TODO: Call Jira to ingest entity
		await figmaService.createDevResource(url, atlassianUserId);
		return designEntity;
	},
};
