import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';
import type { OnDesignDisassociatedFromIssueUseCaseParams } from './on-design-disassociated-from-issue-use-case';
import { onDesignDisassociatedFromIssueUseCase } from './on-design-disassociated-from-issue-use-case';

import type { AssociatedFigmaDesign } from '../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../domain/entities/testing';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

const generateOnDesignDisassociatedWithIssueUseCaseParams = ({
	designId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): OnDesignDisassociatedFromIssueUseCaseParams => ({
	design: {
		ari: 'NOT_USED',
		id: designId,
	},
	issue: {
		ari: generateJiraIssueAri({ issueId }),
		id: issueId,
	},
	atlassianUserId,
	connectInstallation,
});

describe('onDesignDisassociatedWithIssueUseCase', () => {
	it('should delete stored associated Design data and handle backward integration', async () => {
		const figmaDesignId = generateFigmaDesignIdentifier();
		const params = generateOnDesignDisassociatedWithIssueUseCaseParams({
			designId: figmaDesignId.toAtlassianDesignId(),
		});
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
			)
			.mockResolvedValue({} as AssociatedFigmaDesign);
		jest
			.spyOn(
				figmaBackwardIntegrationServiceV2,
				'tryDeleteDevResourceForJiraIssue',
			)
			.mockResolvedValue();

		await onDesignDisassociatedFromIssueUseCase.execute(params);

		expect(
			associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId,
		).toHaveBeenCalledWith(
			figmaDesignId,
			params.issue.ari,
			params.connectInstallation.id,
		);
		expect(
			figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue,
		).toHaveBeenCalledWith({
			figmaDesignId,
			issueId: params.issue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation: params.connectInstallation,
		});
	});

	it('should throw `InvalidInputUseCaseResultError` when design ID has unexpected format', async () => {
		const params = generateOnDesignDisassociatedWithIssueUseCaseParams({
			designId: '',
		});

		await expect(
			onDesignDisassociatedFromIssueUseCase.execute(params),
		).rejects.toBeInstanceOf(InvalidInputUseCaseResultError);
	});
});
