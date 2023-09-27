import type { DisassociateEntityUseCaseParams } from './disassociate-entity-use-case';
import { disassociateEntityUseCase } from './disassociate-entity-use-case';
import { generateDisassociateEntityUseCaseParams } from './testing';

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

describe('disassociateEntityUseCase', () => {
	it('should disassociate design from issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const designId = generateFigmaDesignIdentifier();
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: DisassociateEntityUseCaseParams =
			generateDisassociateEntityUseCaseParams({
				entityId: atlassianDesign.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'fetchDesignById')
			.mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(jiraService, 'deleteDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest.spyOn(figmaService, 'deleteDevResourceIfExists').mockResolvedValue();
		jest
			.spyOn(
				associatedFigmaDesignRepository,
				'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
			)
			.mockResolvedValue(null);

		await disassociateEntityUseCase.execute(params);

		expect(figmaService.fetchDesignById).toHaveBeenCalledWith(
			designId,
			params.atlassianUserId,
		);
		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: atlassianDesign,
				removeAssociations: [
					AtlassianAssociation.createDesignIssueAssociation(
						params.disassociateFrom.ari,
					),
				],
			},
			connectInstallation,
		);
		expect(jiraService.deleteDesignUrlInIssueProperties).toHaveBeenCalledWith(
			issue.id,
			atlassianDesign,
			connectInstallation,
		);
		expect(figmaService.deleteDevResourceIfExists).toHaveBeenCalledWith({
			designId: designId,
			devResourceUrl: `${connectInstallation.baseUrl}/browse/${issue.key}`,
			atlassianUserId: params.atlassianUserId,
		});
		expect(
			associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId,
		).toHaveBeenCalledWith(
			designId,
			params.disassociateFrom.ari,
			connectInstallation.id,
		);
	});

	it('should not delete associated Figma design when design submission fails', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const atlassianDesign = generateAtlassianDesign();
		const params: DisassociateEntityUseCaseParams =
			generateDisassociateEntityUseCaseParams({
				entityId: atlassianDesign.id,
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'fetchDesignById')
			.mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockRejectedValue(new Error());
		jest
			.spyOn(jiraService, 'deleteDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest.spyOn(figmaService, 'deleteDevResourceIfExists').mockResolvedValue();
		jest.spyOn(
			associatedFigmaDesignRepository,
			'deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId',
		);

		await expect(() =>
			disassociateEntityUseCase.execute(params),
		).rejects.toThrow();
		expect(
			associatedFigmaDesignRepository.deleteByDesignIdAndAssociatedWithAriAndConnectInstallationId,
		).not.toHaveBeenCalled();
	});
});
