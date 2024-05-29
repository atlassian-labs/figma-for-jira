import { v4 as uuidv4 } from 'uuid';

import { figmaService, UnauthorizedFigmaServiceError } from './figma';
import { buildDesignUrl } from './figma/transformers/utils';
import { figmaBackwardIntegrationServiceV2 } from './figma-backward-integration-service-v2';
import { jiraService } from './jira';

import { FigmaDesignIdentifier } from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaFileKey,
	generateJiraIssue,
	generateJiraIssueId,
} from '../domain/entities/testing';

describe('FigmaBackwardIntegrationServiceV2', () => {
	describe('tryNotifyFigmaOnDesignAssociatedWithIssue', () => {
		it('should update Issue Properties and create Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const design = generateAtlassianDesign({
				id: figmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(figmaService, 'getDesign').mockResolvedValue(design);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
				{
					figmaDesignId,
					issueId: issue.id,
					atlassianUserId,
					connectInstallation,
				},
			);

			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalledWith(
				issue.id,
				figmaDesignId,
				design,
				connectInstallation,
			);
			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).toHaveBeenCalledWith({
				designId: figmaDesignId,
				issue: {
					key: issue.key,
					title: issue.fields.summary,
					url: `${connectInstallation.baseUrl}/browse/${issue.key}`,
				},
				user: {
					atlassianUserId: atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			});
		});

		it('should update Issue Properties when Atlassian User ID is not given', async () => {
			const connectInstallation = generateConnectInstallation();
			const issue = generateJiraIssue();
			const figmaDesignId = new FigmaDesignIdentifier(generateFigmaFileKey());
			const design = generateAtlassianDesign({
				id: figmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(figmaService, 'getDesign').mockResolvedValue(design);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId: undefined,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalled();
			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).not.toHaveBeenCalled();
		});

		it('should update Issue Properties with fallback value when cannot fetch Design', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = new FigmaDesignIdentifier(generateFigmaFileKey());
			jest.spyOn(figmaService, 'getDesign').mockResolvedValue(null);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalledWith(
				issue.id,
				figmaDesignId,
				{
					url: buildDesignUrl(figmaDesignId).toString(),
					displayName: 'Untitled',
				},
				connectInstallation,
			);
			expect(figmaService.tryCreateDevResourceForJiraIssue).toHaveBeenCalled();
		});

		it('should update Issue Properties with fallback value when unauthorised to fetch Design', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = new FigmaDesignIdentifier(generateFigmaFileKey());
			jest
				.spyOn(figmaService, 'getDesign')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalledWith(
				issue.id,
				figmaDesignId,
				{
					url: buildDesignUrl(figmaDesignId).toString(),
					displayName: 'Untitled',
				},
				connectInstallation,
			);
			expect(figmaService.tryCreateDevResourceForJiraIssue).toHaveBeenCalled();
		});

		it('should not create Dev Resource when Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = new FigmaDesignIdentifier(generateFigmaFileKey());
			const design = generateAtlassianDesign({
				id: figmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(figmaService, 'getDesign').mockResolvedValue(design);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue');

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
					{
						figmaDesignId,
						issueId,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalled();
			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).not.toHaveBeenCalled();
		});

		it('should not throw when unauthorized to create Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = new FigmaDesignIdentifier(generateFigmaFileKey());
			const design = generateAtlassianDesign({
				id: figmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(figmaService, 'getDesign').mockResolvedValue(design);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignAssociatedWithIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
		});
	});

	describe('tryNotifyFigmaOnDesignDisassociatedFromIssue', () => {
		it('should update Issue Properties and delete Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'tryDeleteDesignFromIssueProperties')
				.mockResolvedValue();
			jest.spyOn(figmaService, 'tryDeleteDevResource').mockResolvedValue();

			await figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignDisassociatedFromIssue(
				{
					figmaDesignId,
					issueId: issue.id,
					atlassianUserId,
					connectInstallation,
				},
			);

			expect(
				jiraService.tryDeleteDesignFromIssueProperties,
			).toHaveBeenCalledWith(issue.id, figmaDesignId, connectInstallation);
			expect(figmaService.tryDeleteDevResource).toHaveBeenCalledWith({
				designId: figmaDesignId,
				devResourceUrl: `${connectInstallation.baseUrl}/browse/${issue.key}`,
				user: {
					atlassianUserId: atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			});
		});

		it('should update Issue Properties when Atlassian User ID is not given', async () => {
			const connectInstallation = generateConnectInstallation();
			const issue = generateJiraIssue();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(jiraService, 'tryDeleteDesignFromIssueProperties')
				.mockResolvedValue();
			jest.spyOn(figmaService, 'tryDeleteDevResource');

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignDisassociatedFromIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId: undefined,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(
				jiraService.tryDeleteDesignFromIssueProperties,
			).toHaveBeenCalledWith(issue.id, figmaDesignId, connectInstallation);
			expect(figmaService.tryDeleteDevResource).not.toHaveBeenCalled();
		});

		it('should not delete Dev Resource when Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);
			jest.spyOn(figmaService, 'tryDeleteDevResource');

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignDisassociatedFromIssue(
					{
						figmaDesignId,
						issueId,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
			expect(figmaService.tryDeleteDevResource).not.toHaveBeenCalled();
		});

		it('should not throw when unauthorised to delete a Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(figmaService, 'tryDeleteDevResource')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());

			await expect(
				figmaBackwardIntegrationServiceV2.tryNotifyFigmaOnDesignDisassociatedFromIssue(
					{
						figmaDesignId,
						issueId: issue.id,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
		});
	});
});
