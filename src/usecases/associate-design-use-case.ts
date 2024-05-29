import {
	FigmaDesignNotFoundUseCaseResultError,
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { figmaBackwardIntegrationService } from '../infrastructure';
import {
	figmaService,
	InvalidInputFigmaServiceError,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type AssociateDesignUseCaseParams = {
	readonly designUrl: URL;
	readonly associateWithIssue: {
		readonly ari: string;
		readonly id: string;
	};
	readonly atlassianUserId: string;
	readonly connectInstallation: ConnectInstallation;
};

export const associateDesignUseCase = {
	/**
	 * @throws {ForbiddenByFigmaUseCaseResultError} Not authorized to access Figma.
	 * @throws {InvalidInputUseCaseResultError} The given design URL is invalid.
	 */
	execute: async ({
		designUrl,
		associateWithIssue,
		atlassianUserId,
		connectInstallation,
	}: AssociateDesignUseCaseParams): Promise<AtlassianDesign> => {
		let figmaDesignId: FigmaDesignIdentifier;
		try {
			figmaDesignId = FigmaDesignIdentifier.fromFigmaDesignUrl(designUrl);
		} catch (e) {
			throw new InvalidInputUseCaseResultError(
				'The given design URL is invalid',
			);
		}

		try {
			const design = await figmaService.getDesignOrParent(figmaDesignId, {
				atlassianUserId,
				connectInstallationId: connectInstallation.id,
			});

			if (!design) throw new FigmaDesignNotFoundUseCaseResultError();

			const designIssueAssociation =
				AtlassianAssociation.createDesignIssueAssociation(
					associateWithIssue.ari,
				);

			await jiraService.submitDesign(
				{
					design,
					addAssociations: [designIssueAssociation],
				},
				connectInstallation,
			);

			await Promise.all([
				await associatedFigmaDesignRepository.upsert({
					designId: figmaDesignId,
					associatedWithAri: associateWithIssue.ari,
					connectInstallationId: connectInstallation.id,
					inputUrl: designUrl.toString(),
				}),
				await figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation(
					{
						originalFigmaDesignId: figmaDesignId,
						design,
						issueId: associateWithIssue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			]);

			return design;
		} catch (e) {
			if (e instanceof InvalidInputFigmaServiceError) {
				throw new InvalidInputUseCaseResultError(e.message, e);
			}

			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
