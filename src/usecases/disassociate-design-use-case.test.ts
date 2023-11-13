import type { DisassociateDesignUseCaseParams } from './disassociate-design-use-case';
import { disassociateDesignUseCase } from './disassociate-design-use-case';
import { generateDisassociateDesignUseCaseParams } from './testing';

import { AtlassianAssociation } from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssue,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

describe('disassociateDesignUseCase', () => {
	it('should disassociate design from issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const designId = generateFigmaDesignIdentifier();
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: DisassociateDesignUseCaseParams =
			generateDisassociateDesignUseCaseParams({
				entityId: atlassianDesign.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(figmaService, 'getDesign').mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(jiraService, 'deleteDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest.spyOn(figmaService, 'deleteDevResource').mockResolvedValue();
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
			)
			.mockResolvedValue(null);

		await disassociateDesignUseCase.execute(params);

		expect(figmaService.getDesign).toHaveBeenCalledWith(designId, {
			atlassianUserId: params.atlassianUserId,
			connectInstallationId: params.connectInstallation.id,
		});
		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: atlassianDesign,
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
			atlassianDesign,
			params.connectInstallation,
		);
		expect(figmaService.deleteDevResource).toHaveBeenCalledWith({
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
		jest.spyOn(figmaService, 'deleteDevResource').mockResolvedValue();
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
