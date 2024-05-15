import type { AssociateDesignUseCaseParams } from './associate-design-use-case';
import { associateDesignUseCase } from './associate-design-use-case';
import {
	FigmaDesignNotFoundUseCaseResultError,
	InvalidInputUseCaseResultError,
} from './errors';
import { generateAssociateDesignUseCaseParams } from './testing';

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
import {
	figmaService,
	InvalidInputFigmaServiceError,
} from '../infrastructure/figma';
import { jiraService } from '../infrastructure/jira';
import { associatedFigmaDesignRepository } from '../infrastructure/repositories';

describe('associateDesignUseCase', () => {
	it('should associate design to issue', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: AssociateDesignUseCaseParams =
			generateAssociateDesignUseCaseParams({
				designUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'getDesignOrParent')
			.mockResolvedValue(atlassianDesign);
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

		await associateDesignUseCase.execute(params);

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
		expect(
			figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation,
		).toHaveBeenCalledWith({
			originalFigmaDesignId: designId,
			design: atlassianDesign,
			issueId: params.associateWith.id,
			atlassianUserId: params.atlassianUserId,
			connectInstallation,
		});
		expect(associatedFigmaDesignRepository.upsert).toHaveBeenCalledWith({
			designId,
			associatedWithAri: params.associateWith.ari,
			connectInstallationId: connectInstallation.id,
			inputUrl: params.designUrl.toString(),
		});
	});

	it('should throw FigmaDesignNotFoundUseCaseResultError when design is not found', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const params: AssociateDesignUseCaseParams =
			generateAssociateDesignUseCaseParams({
				designUrl: generateFigmaDesignUrl({ fileKey }),
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(figmaService, 'getDesignOrParent').mockResolvedValue(null);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

		await expect(() =>
			associateDesignUseCase.execute(params),
		).rejects.toBeInstanceOf(FigmaDesignNotFoundUseCaseResultError);
	});

	it('should throw InvalidInputUseCaseResultError when the file is not valid', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const params: AssociateDesignUseCaseParams =
			generateAssociateDesignUseCaseParams({
				// This URL is not valid because it does not contain a file key.
				designUrl: new URL(
					'https://www.figma.com/files/project/176167247/Team-project?fuid=1166427116484924636',
				),
				issueId: issue.id,
				connectInstallation,
			});
		jest.spyOn(figmaService, 'getDesignOrParent').mockResolvedValue(null);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

		await expect(() =>
			associateDesignUseCase.execute(params),
		).rejects.toBeInstanceOf(InvalidInputUseCaseResultError);
	});

	it('should throw InvalidInputUseCaseResultError when the node ids are not valid', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const params: AssociateDesignUseCaseParams =
			generateAssociateDesignUseCaseParams({
				// This URL is not valid because it does not contain a file key.
				designUrl: new URL(
					'https://www.figma.com/file/176167247/Team-project?node-id=0-a',
				),
				issueId: issue.id,
				connectInstallation,
			});
		jest
			.spyOn(figmaService, 'getDesignOrParent')
			.mockRejectedValue(
				new InvalidInputFigmaServiceError('ID 0:a is not a valid node_id'),
			);
		jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

		await expect(() =>
			associateDesignUseCase.execute(params),
		).rejects.toBeInstanceOf(InvalidInputUseCaseResultError);
	});

	it('should not save associated Figma design when design submission fails', async () => {
		const connectInstallation = generateConnectInstallation();
		const issue = generateJiraIssue();
		const fileKey = generateFigmaFileKey();
		const designId = new FigmaDesignIdentifier(fileKey);
		const atlassianDesign = generateAtlassianDesign({
			id: designId.toAtlassianDesignId(),
		});
		const params: AssociateDesignUseCaseParams =
			generateAssociateDesignUseCaseParams({
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

		await expect(() =>
			associateDesignUseCase.execute(params),
		).rejects.toThrow();
		expect(associatedFigmaDesignRepository.upsert).not.toHaveBeenCalled();
	});
});
