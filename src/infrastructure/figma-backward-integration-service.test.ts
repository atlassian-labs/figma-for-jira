import { v4 as uuidv4 } from 'uuid';

import { figmaService } from './figma';
import { figmaBackwardIntegrationService } from './figma-backward-integration-service';
import { jiraService } from './jira';

import { FigmaDesignIdentifier } from '../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaFileKey,
	generateFigmaNodeId,
	generateJiraIssue,
	generateJiraIssueId,
} from '../domain/entities/testing';

describe('FigmaBackwardIntegrationService', () => {
	describe('tryNotifyFigmaOnAddedIssueDesignAssociation', () => {
		it('should update Jira Issue Properties and create Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const originalFigmaDesignId = new FigmaDesignIdentifier(
				generateFigmaFileKey(),
			);
			const atlassianDesign = generateAtlassianDesign({
				id: originalFigmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation(
				{
					originalFigmaDesignId,
					design: atlassianDesign,
					issueId: issue.id,
					atlassianUserId,
					connectInstallation,
				},
			);

			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalledWith(
				issue.id,
				originalFigmaDesignId,
				atlassianDesign,
				connectInstallation,
			);
			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).toHaveBeenCalledWith({
				designId: FigmaDesignIdentifier.fromAtlassianDesignId(
					atlassianDesign.id,
				),
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

		it('should update Jira Issue Properties using original Design ID and create Figma Dev Resource using Design ID from design', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const fileKey = generateFigmaFileKey();
			const originalFigmaDesignId = new FigmaDesignIdentifier(
				fileKey,
				generateFigmaNodeId(),
			);
			const atlassianDesign = generateAtlassianDesign({
				id: new FigmaDesignIdentifier(fileKey).toAtlassianDesignId(),
			});
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

			jest
				.spyOn(jiraService, 'trySaveDesignInIssueProperties')
				.mockResolvedValue();
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation(
				{
					originalFigmaDesignId,
					design: atlassianDesign,
					issueId: issue.id,
					atlassianUserId,
					connectInstallation,
				},
			);

			expect(jiraService.trySaveDesignInIssueProperties).toHaveBeenCalledWith(
				issue.id,
				originalFigmaDesignId,
				atlassianDesign,
				connectInstallation,
			);
			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).toHaveBeenCalledWith({
				designId: FigmaDesignIdentifier.fromAtlassianDesignId(
					atlassianDesign.id,
				),
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

		it('should not throw when Jira Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const originalFigmaDesignId = new FigmaDesignIdentifier(
				generateFigmaFileKey(),
			);
			const atlassianDesign = generateAtlassianDesign({
				id: originalFigmaDesignId.toAtlassianDesignId(),
			});
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);

			await expect(
				figmaBackwardIntegrationService.tryNotifyFigmaOnAddedIssueDesignAssociation(
					{
						originalFigmaDesignId,
						design: atlassianDesign,
						issueId,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
		});
	});

	describe('tryNotifyFigmaOnRemovedIssueDesignAssociation', () => {
		it('should update Jira Issue Properties and delete Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issue = generateJiraIssue();
			const atlassianDesign = generateAtlassianDesign();
			const figmaDesignId = FigmaDesignIdentifier.fromAtlassianDesignId(
				atlassianDesign.id,
			);
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);

			jest
				.spyOn(jiraService, 'tryDeleteDesignFromIssueProperties')
				.mockResolvedValue();
			jest.spyOn(figmaService, 'tryDeleteDevResource').mockResolvedValue();

			await figmaBackwardIntegrationService.tryNotifyFigmaOnRemovedIssueDesignAssociation(
				{
					design: atlassianDesign,
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

		it('should not throw when Jira Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const atlassianDesign = generateAtlassianDesign();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);

			await expect(
				figmaBackwardIntegrationService.tryNotifyFigmaOnRemovedIssueDesignAssociation(
					{
						design: atlassianDesign,
						issueId,
						atlassianUserId,
						connectInstallation,
					},
				),
			).resolves.toBeUndefined();
		});
	});
});
