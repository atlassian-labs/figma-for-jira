import {
	ForbiddenByFigmaUseCaseError,
	InvalidInputUseCaseError,
} from './errors';
import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	buildJiraIssueUrl,
	FigmaDesignIdentifier,
	JIRA_ISSUE_ATI,
} from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

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
	/**
	 * @throws {InvalidInputUseCaseError} An invalid use case input.
	 * @throws {ForbiddenByFigmaUseCaseError} Not authorized to access Figma.
	 */
	execute: async ({
		entity,
		disassociateFrom,
		atlassianUserId,
		connectInstallation,
	}: DisassociateEntityUseCaseParams): Promise<AtlassianDesign> => {
		try {
			if (disassociateFrom.ati !== JIRA_ISSUE_ATI) {
				throw new InvalidInputUseCaseError('Unrecognised ATI');
			}

			const figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
				entity.id,
			);

			const [design, issue] = await Promise.all([
				figmaService.fetchDesignById(figmaDesignId, {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				}),
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
					devResourceUrl: buildJiraIssueUrl(
						connectInstallation.baseUrl,
						issueKey,
					),
					user: {
						atlassianUserId,
						connectInstallationId: connectInstallation.id,
					},
				}),
			]);

			await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
				figmaDesignId,
				disassociateFrom.ari,
				connectInstallation.id,
			);

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseError({ cause: e });
			}

			throw e;
		}
	},
};
