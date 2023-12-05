import type { BackfillDesignUseCaseParams } from './backfill-design-use-case';
import { backfillDesignUseCase } from './backfill-design-use-case';
import { generateBackfillDesignUseCaseParams } from './testing';

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
import { figmaBackfillService } from '../infrastructure/figma/figma-backfill-service';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

describe('backfillDesignUseCase', () => {
	it('should associate design to issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: BackfillDesignUseCaseParams =
			generateBackfillDesignUseCaseParams({
				designUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'getDesignOrParent')
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

		await backfillDesignUseCase.execute(params);

		expect(figmaService.getDesignOrParent).toHaveBeenCalledWith(designId, {
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
			designId,
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
			inputUrl: params.designUrl,
			connectInstallationId: connectInstallation.id,
		});
	});

	it('should construct design from URL when design is being backfilled and it is not found in Figma', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const designUrl = new URL(
			`https://www.figma.com/file/${fileKey}/Design1?com.atlassian.designs.backfill=true`,
		);
		const minimalAtlassianDesign =
			figmaBackfillService.buildMinimalDesignFromUrl(designUrl);
		const params: BackfillDesignUseCaseParams =
			generateBackfillDesignUseCaseParams({
				designUrl: designUrl,
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(figmaService, 'getDesignOrParent').mockResolvedValue(null);
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

		await backfillDesignUseCase.execute(params);

		expect(figmaService.getDesignOrParent).toHaveBeenCalledWith(designId, {
			atlassianUserId: params.atlassianUserId,
			connectInstallationId: params.connectInstallation.id,
		});
		expect(jiraService.submitDesign).toHaveBeenCalledWith(
			{
				design: minimalAtlassianDesign,
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
			designId,
			minimalAtlassianDesign,
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
			inputUrl: params.designUrl,
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
		const params: BackfillDesignUseCaseParams =
			generateBackfillDesignUseCaseParams({
				designUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'getDesignOrParent')
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

		await expect(() => backfillDesignUseCase.execute(params)).rejects.toThrow();
		expect(associatedFigmaDesignRepository.upsert).not.toHaveBeenCalled();
	});
});
