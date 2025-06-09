import { v4 as uuidv4 } from 'uuid';

import { figmaService, UnauthorizedFigmaServiceError } from './figma';
import { figmaBackwardIntegrationServiceV2 } from './figma-backward-integration-service-v2';
import { jiraService } from './jira';

import {
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssue,
	generateJiraIssueId,
} from '../domain/entities/testing';

describe('FigmaBackwardIntegrationServiceV2', () => {
	describe('tryCreateDevResourceForJiraIssue', () => {
		it('should create Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockResolvedValue();

			await figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue({
				figmaDesignId,
				issueId,
				atlassianUserId,
				connectInstallation,
			});

			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).toHaveBeenCalledWith({
				designId: figmaDesignId,
				issue: {
					key: issue.key,
					title: issue.fields.summary,
					url: new URL(`browse/${issue.key}`, connectInstallation.baseUrl),
				},
				user: {
					atlassianUserId: atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			});
		});

		it('should not create Dev Resource when Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);
			jest.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue');

			await figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue({
				figmaDesignId,
				issueId,
				atlassianUserId,
				connectInstallation,
			});

			expect(
				figmaService.tryCreateDevResourceForJiraIssue,
			).not.toHaveBeenCalled();
		});

		it('should not throw when unauthorized to create Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(figmaService, 'tryCreateDevResourceForJiraIssue')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());

			await expect(
				figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue({
					figmaDesignId,
					issueId,
					atlassianUserId,
					connectInstallation,
				}),
			).resolves.not.toThrow();
		});

		it('should throw when unexpected error occurs', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const error = new Error('Unexpected error');
			jest.spyOn(jiraService, 'getIssue').mockRejectedValue(error);

			await expect(
				figmaBackwardIntegrationServiceV2.tryCreateDevResourceForJiraIssue({
					figmaDesignId,
					issueId,
					atlassianUserId,
					connectInstallation,
				}),
			).rejects.toBe(error);
		});
	});

	describe('tryDeleteDevResourceForJiraIssue', () => {
		it('should delete Figma Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest.spyOn(figmaService, 'tryDeleteDevResource').mockResolvedValue();

			await figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue({
				figmaDesignId,
				issueId,
				atlassianUserId,
				connectInstallation,
			});

			expect(figmaService.tryDeleteDevResource).toHaveBeenCalledWith({
				designId: figmaDesignId,
				devResourceUrl: new URL(
					`browse/${issue.key}`,
					connectInstallation.baseUrl,
				),
				user: {
					atlassianUserId: atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			});
		});

		it('should not delete Dev Resource when Issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(null);
			jest.spyOn(figmaService, 'tryDeleteDevResource');

			await figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue({
				figmaDesignId,
				issueId,
				atlassianUserId,
				connectInstallation,
			});

			expect(figmaService.tryDeleteDevResource).not.toHaveBeenCalled();
		});

		it('should not throw when unauthorised to delete a Dev Resource', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const issue = generateJiraIssue({ id: issueId });
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraService, 'getIssue').mockResolvedValue(issue);
			jest
				.spyOn(figmaService, 'tryDeleteDevResource')
				.mockRejectedValue(new UnauthorizedFigmaServiceError());

			await expect(
				figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue({
					figmaDesignId,
					issueId,
					atlassianUserId,
					connectInstallation,
				}),
			).resolves.not.toThrow();
		});

		it('should throw when unexpected error occurs', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianUserId = uuidv4();
			const issueId = generateJiraIssueId();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const error = new Error('Unexpected error');
			jest.spyOn(jiraService, 'getIssue').mockRejectedValue(error);

			await expect(
				figmaBackwardIntegrationServiceV2.tryDeleteDevResourceForJiraIssue({
					figmaDesignId,
					issueId,
					atlassianUserId,
					connectInstallation,
				}),
			).rejects.toBe(error);
		});
	});
});
