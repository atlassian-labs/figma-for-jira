import type { DisassociateDesignUseCaseParams } from './disassociate-design-use-case';
import { disassociateDesignUseCase } from './disassociate-design-use-case';
import { generateDisassociateDesignUseCaseParams } from './testing';

import {
	AtlassianAssociation,
	AtlassianDesignStatus,
	AtlassianDesignType,
} from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssue,
} from '../domain/entities/testing';
import { figmaBackwardIntegrationService } from '../infrastructure';
import { figmaService } from '../infrastructure/figma';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
	getResourceIconUrl,
} from '../infrastructure/figma/transformers/utils';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

describe('disassociateDesignUseCase', () => {
	const currentDate = new Date();

	beforeEach(() => {
		jest
			.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
			.setSystemTime(currentDate);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should disassociate design from issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const designId = generateFigmaDesignIdentifier();
		const designStub = {
			id: designId.toAtlassianDesignId(),
			displayName: 'Untitled',
			url: buildDesignUrl(designId).toString(),
			liveEmbedUrl: buildLiveEmbedUrl(designId).toString(),
			inspectUrl: buildInspectUrl(designId).toString(),
			status: AtlassianDesignStatus.UNKNOWN,
			type: AtlassianDesignType.OTHER,
			lastUpdated: currentDate.toISOString(),
			updateSequenceNumber: 0,
			iconUrl: getResourceIconUrl(),
		};
		const params: DisassociateDesignUseCaseParams =
			generateDisassociateDesignUseCaseParams({
				entityId: designStub.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(
				figmaBackwardIntegrationService,
				'tryNotifyFigmaOnRemovedIssueDesignAssociation',
			)
			.mockResolvedValue();
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
			)
			.mockResolvedValue(null);

		await disassociateDesignUseCase.execute(params);

		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: designStub,
				removeAssociations: [
					AtlassianAssociation.createDesignIssueAssociation(
						params.disassociateFrom.ari,
					),
				],
			},
			params.connectInstallation,
		);
		expect(
			figmaBackwardIntegrationService.tryNotifyFigmaOnRemovedIssueDesignAssociation,
		).toHaveBeenCalledWith({
			design: designStub,
			issueId: params.disassociateFrom.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation,
		});
		expect(
			associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId,
		).toHaveBeenCalledWith(
			designId,
			params.disassociateFrom.ari,
			params.connectInstallation.id,
		);
	});

	it('should not delete associated Figma design when design submission fails', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const atlassianDesign = generateAtlassianDesign();
		const params: DisassociateDesignUseCaseParams =
			generateDisassociateDesignUseCaseParams({
				entityId: atlassianDesign.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(figmaService, 'getDesign').mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'submitDesign').mockRejectedValue(new Error());
		jest
			.spyOn(
				figmaBackwardIntegrationService,
				'tryNotifyFigmaOnRemovedIssueDesignAssociation',
			)
			.mockResolvedValue();
		jest.spyOn(
			associatedFigmaDesignRepository,
			'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
		);

		await expect(() =>
			disassociateDesignUseCase.execute(params),
		).rejects.toThrow();
		expect(
			associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId,
		).not.toHaveBeenCalled();
	});
});
