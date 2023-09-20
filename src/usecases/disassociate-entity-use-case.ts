import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
	JIRA_ISSUE_ATI,
} from '../domain/entities';
import { figmaService } from '../infrastructure/figma';
import { buildIssueUrl, jiraService } from '../infrastructure/jira';

export type DisassociateEntityUseCaseParams = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly disassociateFrom: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const disassociateEntityUseCase = {
	execute: async ({
		entity,
		disassociateFrom,
		atlassianUserId,
		connectInstallation,
	}: DisassociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		if (disassociateFrom.ati !== JIRA_ISSUE_ATI) {
			throw new Error('Unrecognised ATI');
		}

		const figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
			entity.id,
		);

		const [design, issue] = await Promise.all([
			figmaService.fetchDesignById(figmaDesignId, atlassianUserId),
			jiraService.getIssue(disassociateFrom.id, connectInstallation),
		]);

		const designIssueAssociation =
			AtlassianAssociation.createDesignIssueAssociation(disassociateFrom.ari);

		const { key: issueKey, id: issueId } = issue;

		await Promise.all([
			jiraService.submitDesign(
				{
					design,
					removeAssociations: [designIssueAssociation],
				},
				connectInstallation,
			),
			jiraService.deleteDesignUrlInIssueProperties(
				issueId,
				design,
				connectInstallation,
			),
			figmaService.deleteDevResourceIfExists({
				designId: figmaDesignId,
				issueUrl: buildIssueUrl(connectInstallation.baseUrl, issueKey),
				atlassianUserId,
			}),
		]);

		return design;
	},
};
