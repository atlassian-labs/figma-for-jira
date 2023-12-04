import type { DisassociateDesignUseCaseParams } from './disassociate-design-use-case';
import { disassociateDesignUseCase } from './disassociate-design-use-case';
import { generateDisassociateDesignUseCaseParams } from './testing';

import * as configModule from '../config';
import { mockConfig } from '../config/testing';
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
import { figmaService } from '../infrastructure/figma';
import {
	buildDesignUrl,
	buildInspectUrl,
	buildLiveEmbedUrl,
} from '../infrastructure/figma/transformers/utils';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

jest.mock('../config', () => {
	return {
		...jest.requireActual('../config'),
		getConfig: jest.fn(),
	};
});

describe('disassociateDesignUseCase', () => {
	const currentDate = new Date();

	beforeEach(() => {
		(configModule.getConfig as jest.Mock).mockReturnValue(mockConfig);
		jest
			.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
			.setSystemTime(currentDate);
	});

	afterEach(() => {
		jest.restoreAllMocks();
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
		};
		const params: DisassociateDesignUseCaseParams =
			generateDisassociateDesignUseCaseParams({
				entityId: designStub.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(jiraService, 'deleteDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest.spyOn(figmaService, 'tryDeleteDevResource').mockResolvedValue();
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
		expect(jiraService.deleteDesignUrlInIssueProperties).toHaveBeenCalledWith(
			issue.id,
			designStub,
			params.connectInstallation,
		);
		expect(figmaService.tryDeleteDevResource).toHaveBeenCalledWith({
			designId: designId,
			devResourceUrl: `${connectInstallation.baseUrl}/browse/${issue.key}`,
			user: {
				atlassianUserId: params.atlassianUserId,
				connectInstallationId: params.connectInstallation.id,
			},
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
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockRejectedValue(new Error());
		jest
			.spyOn(jiraService, 'deleteDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest.spyOn(figmaService, 'tryDeleteDevResource').mockResolvedValue();
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
