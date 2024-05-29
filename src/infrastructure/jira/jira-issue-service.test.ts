import { jiraClient } from './jira-client';
import { jiraService } from './jira-service';

import {
	generateConnectInstallation,
	generateJiraIssue,
	generateJiraIssueKey,
} from '../../domain/entities/testing';
import { NotFoundHttpClientError } from '../http-client-errors';

describe('JiraIssueService', () => {
	describe('getIssue', () => {
		it('should return issue', async () => {
			const connectInstallation = generateConnectInstallation();
			const jiraIssue = generateJiraIssue();
			jest.spyOn(jiraClient, 'getIssue').mockResolvedValue(jiraIssue);

			const result = await jiraService.getIssue(
				jiraIssue.key,
				connectInstallation,
			);

			expect(result).toBe(jiraIssue);
			expect(jiraClient.getIssue).toHaveBeenCalledWith(
				jiraIssue.key,
				connectInstallation,
			);
		});

		it('should return `null` when issue is not found', async () => {
			const connectInstallation = generateConnectInstallation();
			const issueKey = generateJiraIssueKey();
			jest
				.spyOn(jiraClient, 'getIssue')
				.mockRejectedValue(new NotFoundHttpClientError());

			const result = await jiraService.getIssue(issueKey, connectInstallation);

			expect(result).toBeNull();
		});
	});
});
