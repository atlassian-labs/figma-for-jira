import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';
import type { OnDesignDisassociatedFromIssueUseCaseParams } from './on-design-disassociated-from-issue-use-case';
import { onDesignDisassociatedFromIssueUseCase } from './on-design-disassociated-from-issue-use-case';

import * as launchDarkly from '../config/launch_darkly';
import {
	type AssociatedFigmaDesign,
	FigmaFileWebhookEventType,
} from '../domain/entities';
import {
	generateAssociatedFigmaDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaFileWebhook,
	generateJiraIssueAri,
	generateJiraIssueId,
} from '../domain/entities/testing';
import { figmaBackwardIntegrationServiceV2 } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import {
	associatedFigmaDesignRepository,
	figmaFileWebhookRepository,
} from '../infrastructure/repositories';

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
		jest.spyOn(launchDarkly, 'getLDClient').mockResolvedValue(null);
		jest.spyOn(launchDarkly, 'getFeatureFlag').mockResolvedValue(true);

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
		const webhooks = [
			generateFigmaFileWebhook({
				fileKey: figmaDesignId.fileKey,
				eventType: FigmaFileWebhookEventType.FILE_UPDATE,
			}),
			generateFigmaFileWebhook({
				fileKey: figmaDesignId.fileKey,
				eventType: FigmaFileWebhookEventType.DEV_MODE_STATUS_UPDATE,
			}),
		];
		jest
			.spyOn(
				figmaFileWebhookRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue(webhooks);
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue([]);
		jest.spyOn(figmaService, 'tryDeleteWebhook').mockResolvedValue();
		jest
			.spyOn(figmaFileWebhookRepository, 'delete')
			.mockResolvedValueOnce(webhooks[0])
			.mockResolvedValueOnce(webhooks[1]);

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
		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			webhooks[0].webhookId,
			webhooks[0].createdBy,
		);
		expect(figmaFileWebhookRepository.delete).toHaveBeenCalledWith(
			webhooks[0].id,
		);

		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledWith(
			webhooks[1].webhookId,
			webhooks[1].createdBy,
		);
		expect(figmaFileWebhookRepository.delete).toHaveBeenCalledWith(
			webhooks[1].id,
		);
	});

	it('should not delete file webhooks more files rely on them', async () => {
		jest.spyOn(launchDarkly, 'getLDClient').mockResolvedValue(null);
		jest.spyOn(launchDarkly, 'getFeatureFlag').mockResolvedValue(true);

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

		const webhooks = [
			generateFigmaFileWebhook({
				fileKey: figmaDesignId.fileKey,
				eventType: FigmaFileWebhookEventType.FILE_UPDATE,
			}),
			generateFigmaFileWebhook({
				fileKey: figmaDesignId.fileKey,
				eventType: FigmaFileWebhookEventType.DEV_MODE_STATUS_UPDATE,
			}),
		];
		jest
			.spyOn(
				figmaFileWebhookRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue(webhooks);
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue([generateAssociatedFigmaDesign()]);
		jest.spyOn(figmaService, 'tryDeleteWebhook');
		jest.spyOn(figmaFileWebhookRepository, 'delete');

		await onDesignDisassociatedFromIssueUseCase.execute(params);

		expect(figmaService.tryDeleteWebhook).toHaveBeenCalledTimes(0);
		expect(figmaFileWebhookRepository.delete).toHaveBeenCalledTimes(0);
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
