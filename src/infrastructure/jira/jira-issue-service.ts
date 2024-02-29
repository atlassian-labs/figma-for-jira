import { NotFoundInJiraServiceError } from './errors';
import { jiraClient } from './jira-client';

import type { ConnectInstallation, JiraIssue } from '../../domain/entities';
import { NotFoundHttpClientError } from '../http-client-errors';

export class JiraIssueService {
	/**
	 * @throws {NotFoundInJiraServiceError} Issue does not exist or the app does not have permission to read it.
	 */
	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<JiraIssue> => {
		try {
			return await jiraClient.getIssue(issueIdOrKey, connectInstallation);
		} catch (error) {
			if (error instanceof NotFoundHttpClientError) {
				throw new NotFoundInJiraServiceError('Issue is not found.', error);
			}

			throw error;
		}
	};
}

export const jiraIssueService = new JiraIssueService();
