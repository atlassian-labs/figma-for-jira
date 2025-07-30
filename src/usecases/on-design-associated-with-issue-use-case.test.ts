import type { WebhookV2, WebhookV2Event } from '@figma/rest-api-spec';
import { v4 as uuidv4 } from 'uuid';

import { InvalidInputUseCaseResultError } from './errors';
import type { OnDesignAssociatedWithIssueUseCaseParams } from './on-design-associated-with-issue-use-case';
import { onDesignAssociatedWithIssueUseCaseParams } from './on-design-associated-with-issue-use-case';

import * as launch_darkly from '../config/launch_darkly';
import {
	type AssociatedFigmaDesign,
	type FigmaFileWebhook,
	FigmaFileWebhookEventType,
} from '../domain/entities';
import {
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

const generateWebhookV2 = (
	fileKey: string,
	eventType: WebhookV2Event,
): WebhookV2 => ({
	id: uuidv4(),
	context: 'file',
	context_id: fileKey,
	event_type: eventType,
	team_id: '',
	status: 'ACTIVE',
	endpoint: 'https://figma-for-jira-test.com',
	passcode: uuidv4(),
	client_id: uuidv4(),
	plan_api_id: `organization:${uuidv4()}`,
	description: 'Figma for Jira Test Webhook',
});

describe('onDesignAssociatedWithIssueUseCase', () => {
	beforeEach(() => {
		// set getFeatureFlag to return true for all feature flags
		jest.spyOn(launch_darkly, 'getFeatureFlag').mockResolvedValue(true);
	});

	it('should store associated Design data, handle backward integration, and create file webhooks', async () => {
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
				'tryCreateDevResourceForJiraIssue',
			)
			.mockResolvedValue();
		jest
			.spyOn(
				figmaFileWebhookRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue([]);
		const fileWebhook = generateWebhookV2(figmaDesignId.fileKey, 'FILE_UPDATE');
		const devModeStatusUpdateWebhook = generateWebhookV2(
			figmaDesignId.fileKey,
			'DEV_MODE_STATUS_UPDATE',
		);
		const createFileContextWebhooksMock = jest
			.spyOn(figmaService, 'createFileContextWebhooks')
			.mockResolvedValue({
				fileWebhook,
				devModeStatusUpdateWebhook,
			});
		jest
			.spyOn(figmaFileWebhookRepository, 'upsert')
			.mockResolvedValue({} as FigmaFileWebhook);

		await onDesignAssociatedWithIssueUseCaseParams.execute(params);

		expect(associatedFigmaDesignRepository.upsert).toHaveBeenCalledWith({
			designId: figmaDesignId,
			associatedWithAri: params.issue.ari,
			connectInstallationId: params.connectInstallation.id,
			inputUrl: undefined,
		});
		expect(
			figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue,
		).toHaveBeenCalledWith({
			figmaDesignId,
			issueId: params.issue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation: params.connectInstallation,
		});
		expect(
			figmaFileWebhookRepository.findManyByFileKeyAndConnectInstallationId,
		).toHaveBeenCalledWith(
			figmaDesignId.fileKey,
			params.connectInstallation.id,
		);
		expect(figmaService.createFileContextWebhooks).toHaveBeenCalledWith(
			figmaDesignId.fileKey,
			expect.any(String),
			{
				connectInstallationId: params.connectInstallation.id,
				atlassianUserId: params.atlassianUserId,
			},
		);

		const passcode = createFileContextWebhooksMock.mock.calls[0][1];
		expect(figmaFileWebhookRepository.upsert).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				webhookId: fileWebhook.id,
				webhookPasscode: passcode,
				connectInstallationId: params.connectInstallation.id,
				creatorAtlassianUserId: params.atlassianUserId,
				eventType: 'FILE_UPDATE',
			}),
		);
		expect(figmaFileWebhookRepository.upsert).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				webhookId: devModeStatusUpdateWebhook.id,
				webhookPasscode: passcode,
				connectInstallationId: params.connectInstallation.id,
				creatorAtlassianUserId: params.atlassianUserId,
				eventType: 'DEV_MODE_STATUS_UPDATE',
			}),
		);
	});

	it('should not create new figma file webhooks if webhooks already exist on the file', async () => {
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
				'tryCreateDevResourceForJiraIssue',
			)
			.mockResolvedValue();

		const fileWebhook = generateFigmaFileWebhook({
			fileKey: figmaDesignId.fileKey,
			connectInstallationId: params.connectInstallation.id,
		});
		const devModeStatusUpdateWebhook = generateFigmaFileWebhook({
			fileKey: figmaDesignId.fileKey,
			connectInstallationId: params.connectInstallation.id,
			eventType: FigmaFileWebhookEventType.DEV_MODE_STATUS_UPDATE,
		});
		jest
			.spyOn(
				figmaFileWebhookRepository,
				'findManyByFileKeyAndConnectInstallationId',
			)
			.mockResolvedValue([fileWebhook, devModeStatusUpdateWebhook]);

		jest.spyOn(figmaService, 'createFileContextWebhooks');
		jest.spyOn(figmaFileWebhookRepository, 'upsert');

		await onDesignAssociatedWithIssueUseCaseParams.execute(params);

		expect(
			figmaFileWebhookRepository.findManyByFileKeyAndConnectInstallationId,
		).toHaveBeenCalledWith(
			figmaDesignId.fileKey,
			params.connectInstallation.id,
		);
		expect(figmaService.createFileContextWebhooks).toHaveBeenCalledTimes(0);
		expect(figmaFileWebhookRepository.upsert).toHaveBeenCalledTimes(0);
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
