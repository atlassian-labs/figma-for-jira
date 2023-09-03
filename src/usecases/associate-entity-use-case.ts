import type { AtlassianDesign } from '../domain/entities/design';
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
	readonly atlassianUserId: string;
};

export const associateEntityUseCase = {
	execute: async ({
		entity,
		associateWith,
		atlassianUserId,
	}: AssociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		const designEntity = await figmaService.fetchDesign(
			entity.url,
			atlassianUserId,
			associateWith,
		);
		// TODO: Call Jira to fetch issue details
		await figmaService.createDevResource(entity.url, atlassianUserId);
		// TODO: Call Jira to ingest entity
		return designEntity;
	},
};
