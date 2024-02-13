import type { BackfillDesignUseCaseParams } from './backfill-design-use-case';
import { backfillDesignUseCase } from './backfill-design-use-case';
import { InvalidInputUseCaseResultError } from './errors';
import { generateBackfillDesignUseCaseParams } from './testing';

import { flushMacrotaskQueue } from '../common/testing/utils';
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
import { submitFullDesign } from '../jobs';

jest.mock('../jobs', () => {
	return {
		...jest.requireActual('../jobs'),
		submitFullDesign: jest.fn(),
	};
});

describe('backfillDesignUseCase', () => {
	it('should associate a minimal design to issue and submit full design asynchronously', async () => {
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
			connectInstallationId: connectInstallation.id,
			inputUrl: params.designUrl.toString(),
		});
		await flushMacrotaskQueue();
		expect(submitFullDesign).toHaveBeenCalledWith({
			figmaDesignId: designId,
			associateWith: params.associateWith,
			atlassianUserId: params.atlassianUserId,
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
		await flushMacrotaskQueue();
		expect(associatedFigmaDesignRepository.upsert).not.toHaveBeenCalled();
		expect(submitFullDesign).not.toHaveBeenCalled();
	});

	it('should throw InvalidInputUseCaseResultError when the file is not valid', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();

		const params: BackfillDesignUseCaseParams =
			generateBackfillDesignUseCaseParams({
				// This URL is not valid because it does not contain a file key.
				designUrl: new URL(
					'https://www.figma.com/files/project/176167247/Team-project?fuid=1166427116484924636',
				),
				issueId: issue.id,
				connectInstallation,
			});

		await expect(() => backfillDesignUseCase.execute(params)).rejects.toThrow(
			InvalidInputUseCaseResultError,
		);
		await flushMacrotaskQueue();
		expect(associatedFigmaDesignRepository.upsert).not.toHaveBeenCalled();
		expect(submitFullDesign).not.toHaveBeenCalled();
	});
});
