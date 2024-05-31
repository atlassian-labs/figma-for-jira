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
import { figmaBackwardIntegrationService } from '../infrastructure';
import { figmaBackfillService, figmaService } from '../infrastructure/figma';
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
		jest.spyOn(jiraService, 'submitDesign').mockResolvedValue();
		jest
			.spyOn(
				figmaBackwardIntegrationService,
				'tryNotifyFigmaOnAddedIssueDesignAssociation',
			)
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
						params.associateWithIssue.ari,
					),
				],
			},
			connectInstallation,
		);
		expect(
			figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation,
		).toHaveBeenCalledWith({
			originalFigmaDesignId: designId,
			design: minimalAtlassianDesign,
			issueId: params.associateWithIssue.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation,
		});
		expect(associatedFigmaDesignRepository.upsert).toHaveBeenCalledWith({
			designId,
			associatedWithAri: params.associateWithIssue.ari,
			connectInstallationId: connectInstallation.id,
			inputUrl: params.designUrl.toString(),
		});
		await flushMacrotaskQueue();
		expect(submitFullDesign).toHaveBeenCalledWith({
			figmaDesignId: designId,
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
		jest.spyOn(jiraService, 'submitDesign').mockRejectedValue(new Error());
		jest
			.spyOn(
				figmaBackwardIntegrationService,
				'tryNotifyFigmaOnAddedIssueDesignAssociation',
			)
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
		jest.spyOn(associatedFigmaDesignRepository, 'upsert');

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
