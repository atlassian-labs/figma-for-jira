import type { AssociateEntityUseCaseParams } from './associate-entity-use-case';
import { associateEntityUseCase } from './associate-entity-use-case';
import { generateAssociateEntityUseCaseParams } from './testing';

import type { AssociatedFigmaDesign } from '../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateJiraIssue,
} from '../domain/entities/testing';
import { figmaService } from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

describe('associateEntityUseCase', () => {
	it('should associate design to issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: AssociateEntityUseCaseParams =
			generateAssociateEntityUseCaseParams({
				entityUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'fetchDesignById')
			.mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(jiraService, 'saveDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest
			.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
			.mockResolvedValue();
		jest
			.spyOn(associatedFigmaDesignRepository, 'upsert')
			.mockResolvedValue({} as AssociatedFigmaDesign);

		await associateEntityUseCase.execute(params);

		expect(figmaService.fetchDesignById).toHaveBeenCalledWith(designId, {
			atlassianUserId: params.atlassianUserId,
			connectInstallationId: params.connectInstallation.id,
		});
		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: atlassianDesign,
				addAssociations: [
					AtlassianAssociation.createDesignIssueAssociation(
						params.associateWith.ari,
					),
				],
			},
			connectInstallation,
		);
		expect(jiraService.saveDesignUrlInIssueProperties).toHaveBeenCalledWith(
			issue.id,
			atlassianDesign,
			connectInstallation,
		);
		expect(figmaService.tryCreateDevResourceForJiraIssue).toHaveBeenCalledWith({
			designId,
			issue: {
				key: issue.key,
				title: issue.fields.summary,
				url: `${connectInstallation.baseUrl}/browse/${issue.key}`,
			},
			user: {
				atlassianUserId: params.atlassianUserId,
				connectInstallationId: params.connectInstallation.id,
			},
		});
		expect(associatedFigmaDesignRepository.upsert).toHaveBeenCalledWith({
			designId,
			associatedWithAri: params.associateWith.ari,
			connectInstallationId: connectInstallation.id,
		});
	});

	it('should not save associated Figma design when design submission fails', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: AssociateEntityUseCaseParams =
			generateAssociateEntityUseCaseParams({
				entityUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'fetchDesignById')
			.mockResolvedValue(atlassianDesign);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
		jest.spyOn(jiraService, 'submitDesign').mockRejectedValue(new Error());
		jest
			.spyOn(jiraService, 'saveDesignUrlInIssueProperties')
			.mockResolvedValue();
		jest
			.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
			.mockResolvedValue();
		jest.spyOn(associatedFigmaDesignRepository, 'upsert');

		await expect(() =>
			associateEntityUseCase.execute(params),
		).rejects.toThrow();
		expect(associatedFigmaDesignRepository.upsert).not.toHaveBeenCalled();
	});
});
