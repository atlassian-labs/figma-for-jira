import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';
import type { OnDesignAssociatedWithIssueUseCaseParams } from './on-design-associated-with-issue-use-case';
import { onDesignAssociatedWithIssueUseCaseParams } from './on-design-associated-with-issue-use-case';

import type { AssociatedFigmaDesign } from '../domain/entities';
import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../domain/entities/testing';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

const generateOnDesignAssociatedWithIssueUseCaseParams = ({
	designId = generateFigmaDesignIdentifier().toAtlassianDesignId(),
	issueId = generateJiraIssueId(),
	atlassianUserId = uuidv4(),
	connectInstallation = generateConnectInstallation(),
} = {}): OnDesignAssociatedWithIssueUseCaseParams => ({
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

describe('onDesignAssociatedWithIssueUseCase', () => {
	it('should store associated Design data and handle backward integration', async () => {
		const figmaDesignId = generateFigmaDesignIdentifier();
		const params = generateOnDesignAssociatedWithIssueUseCaseParams({
			designId: figmaDesignId.toAtlassianDesignId(),
		});
		jest
			.spyOn(associatedFigmaDesignRepository, 'upsert')
			.mockResolvedValue({} as AssociatedFigmaDesign);
		jest
			.spyOn(
				figmaBackwardIntegrationServiceV2,
				'tryNotifyFigmaOnDesignAssociatedWithIssue',
			)
			.mockResolvedValue();

		await onDesignAssociatedWithIssueUseCaseParams.execute(params);

		expect(associatedFigmaDesignRepository.upsert).toHaveBeenCalledWith({
			designId: figmaDesignId,
			associatedWithAri: params.issue.ari,
			connectInstallationId: params.connectInstallation.id,
			inputUrl: undefined,
		});
		expect(
			figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue,
		).toHaveBeenCalledWith({
			figmaDesignId,
			issueId: params.issue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation: params.connectInstallation,
		});
	});

	it('should throw `InvalidInputUseCaseResultError` when design ID has unexpected format', async () => {
		const params = generateOnDesignAssociatedWithIssueUseCaseParams({
			designId: '',
		});

		await expect(
			onDesignAssociatedWithIssueUseCaseParams.execute(params),
		).rejects.toBeInstanceOf(InvalidInputUseCaseResultError);
	});
});
