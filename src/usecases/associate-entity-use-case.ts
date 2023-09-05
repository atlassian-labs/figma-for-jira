import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { jiraClient } from '../infrastructure/jira/jira-client';

export type AssociateWith = {
	readonly ati: string;
	readonly ari: string;
	readonly cloudId: string;
	readonly id: string;
};

export type AssociateEntityUseCaseParams = {
	readonly entity: {
		readonly url: string;
	};
	readonly associateWith: AssociateWith;
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
		const jiraClientParams = {
			baseUrl: connectInstallation.baseUrl,
			connectAppKey: connectInstallation.key,
			connectSharedSecret: connectInstallation.sharedSecret,
		};

		const [design, issue] = await Promise.all([
			figmaService.fetchDesign(entity.url, atlassianUserId, associateWith),
			jiraClient.getIssue(associateWith.id, jiraClientParams),
		]);

		const { self: issueUrl, fields } = issue;

		await Promise.all([
			jiraClient.submitDesigns({ designs: [design] }, jiraClientParams),
			figmaService.createDevResource({
				designUrl: entity.url,
				issueUrl,
				issueTitle: fields.summary,
				atlassianUserId,
			}),
		]);

		return design;
	},
};
