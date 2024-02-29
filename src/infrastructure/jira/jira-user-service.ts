import { ForbiddenByJiraServiceError } from './errors';
import { jiraClient } from './jira-client';

import type { ConnectInstallation } from '../../domain/entities';
import { ForbiddenHttpClientError } from '../http-client-errors';

const ADMIN_GLOBAL_PERMISSION = 'ADMINISTER';

export class JiraUserService {
	isAdmin = async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<boolean> => {
		try {
			const response = await jiraClient.checkPermissions(
				{
					accountId: atlassianUserId,
					globalPermissions: [ADMIN_GLOBAL_PERMISSION],
				},
				connectInstallation,
			);
			return response.globalPermissions.includes(ADMIN_GLOBAL_PERMISSION);
		} catch (error) {
			if (error instanceof ForbiddenHttpClientError) {
				throw new ForbiddenByJiraServiceError(undefined, error);
			}
			throw error;
		}
	};
}

export const jiraUserService = new JiraUserService();
