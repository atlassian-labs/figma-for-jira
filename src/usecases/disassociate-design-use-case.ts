import {
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';
import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	AtlassianDesignStatus,
	AtlassianDesignType,
	buildJiraIssueUrl,
	FigmaDesignIdentifier,
	JIRA_ISSUE_ATI,
} from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
} from '../infrastructure/figma/transformers/utils';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type DisassociateDesignUseCaseParams = {
	readonly entity: {
		readonly ari: string;
		readonly id: string;
	};
	readonly disassociateFrom: AtlassianEntity;
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const disassociateDesignUseCase = {
	/**
	 * @throws {InvalidInputUseCaseResultError} An invalid use case input.
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 */
	execute: async ({
		entity,
		disassociateFrom,
		atlassianUserId,
		connectInstallation,
	}: DisassociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		try {
			if (disassociateFrom.ati !== JIRA_ISSUE_ATI) {
				throw new InvalidInputUseCaseResultError('Unrecognised ATI');
			}

			const figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
				entity.id,
			);

			// By setting updateSequenceNumber to 0 the design will not be updated,
			// and therefore we don't need to fetch the actual design data.
			const designStub = {
				id: figmaDesignId.toAtlassianDesignId(),
				displayName: 'Untitled',
				url: buildDesignUrl(figmaDesignId).toString(),
				liveEmbedUrl: buildLiveEmbedUrl(figmaDesignId).toString(),
				inspectUrl: buildInspectUrl(figmaDesignId).toString(),
				status: AtlassianDesignStatus.UNKNOWN,
				type: AtlassianDesignType.OTHER,
				lastUpdated: new Date().toISOString(),
				updateSequenceNumber: 0,
			};

			const issue = await jiraService.getIssue(
				disassociateFrom.id,
				connectInstallation,
			);

			const designIssueAssociation =
				AtlassianAssociation.createDesignIssueAssociation(disassociateFrom.ari);

			const { key: issueKey, id: issueId } = issue;

			await Promise.all([
				jiraService.submitDesign(
					{
						design: designStub,
						removeAssociations: [designIssueAssociation],
					},
					connectInstallation,
				),
				jiraService.deleteDesignUrlInIssueProperties(
					issueId,
					designStub,
					connectInstallation,
				),
				figmaService.tryDeleteDevResource({
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

			return designStub;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
