import { ForbiddenByFigmaUseCaseResultError } from './errors';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	AtlassianDesignStatus,
	AtlassianDesignType,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { figmaBackwardIntegrationService } from '../infrastructure';
import { UnauthorizedFigmaServiceError } from '../infrastructure/figma';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
} from '../infrastructure/figma/transformers/utils';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type DisassociateDesignUseCaseParams = {
	readonly design: {
		readonly ari: string;
		readonly id: string;
	};
	readonly disassociateFromIssue: {
		readonly ari: string;
		readonly id: string;
	};
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const disassociateDesignUseCase = {
	/**
	 * @throws {InvalidInputUseCaseResultError} An invalid use case input.
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 */
	execute: async ({
		design,
		disassociateFromIssue,
		atlassianUserId,
		connectInstallation,
	}: DisassociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		try {
			const figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
				design.id,
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

			const designIssueAssociation =
				AtlassianAssociation.createDesignIssueAssociation(
					disassociateFromIssue.ari,
				);

			await jiraService.submitDesign(
				{
					design: designStub,
					removeAssociations: [designIssueAssociation],
				},
				connectInstallation,
			);

			await Promise.all([
				await associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId(
					figmaDesignId,
					disassociateFromIssue.ari,
					connectInstallation.id,
				),
				await figmaBackwardIntegrationService.tryNotifyFigmaOnRemovedIssueDesignAssociation(
					{
						design: designStub,
						issueId: disassociateFromIssue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			]);

			return designStub;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
