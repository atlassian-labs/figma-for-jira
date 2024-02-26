import {
	FigmaDesignNotFoundUseCaseResultError,
	ForbiddenByFigmaUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';
import type { AtlassianEntity } from './types';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import {
	figmaService,
	UnauthorizedFigmaServiceError,
} from '../infrastructure/figma';
import { figmaAppBackwardIntegrationService } from '../infrastructure/figma-app-backward-integration-service';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

export type AssociateDesignUseCaseParams = {
	readonly designUrl: URL;
	readonly associateWith: AtlassianEntity;
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
		associateWith,
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
				AtlassianAssociation.createDesignIssueAssociation(associateWith.ari);

			// Makes the best effort to provide the backward integration with the "Jira" Widget and Plugin in Figma.
			await figmaAppBackwardIntegrationService.tryHandleLinkedDesign({
				originalFigmaDesignId: figmaDesignId,
				design,
				issueId: associateWith.id,
				atlassianUserId,
				connectInstallation,
			});

			await jiraService.submitDesign(
				{
					design,
					addAssociations: [designIssueAssociation],
				},
				connectInstallation,
			);

			await associatedFigmaDesignRepository.upsert({
				designId: figmaDesignId,
				associatedWithAri: associateWith.ari,
				connectInstallationId: connectInstallation.id,
				inputUrl: designUrl.toString(),
			});

			return design;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				throw new ForbiddenByFigmaUseCaseResultError(e);
			}

			throw e;
		}
	},
};
