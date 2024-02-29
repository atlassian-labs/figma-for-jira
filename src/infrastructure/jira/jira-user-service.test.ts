import { v4 as uuidv4 } from 'uuid';

import { ForbiddenByJiraServiceError } from './errors';
import { jiraClient } from './jira-client';
import { generateCheckPermissionsResponse } from './jira-client/testing';
import { jiraService } from './jira-service';

import { generateConnectInstallation } from '../../domain/entities/testing';
import { ForbiddenHttpClientError } from '../http-client-errors';

describe('JiraUserService', () => {
	describe('isAdmin', () => {
		it('should return false if user does not have ADMINISTER permission', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'checkPermissions').mockResolvedValue(
				generateCheckPermissionsResponse({
					globalPermissions: [],
				}),
			);

			const result = await jiraService.isAdmin(
				atlassianUserId,
				connectInstallation,
			);

			expect(result).toBe(false);
		});

		it('should return true if user has ADMINISTER permission', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'checkPermissions').mockResolvedValue(
				generateCheckPermissionsResponse({
					globalPermissions: ['ADMINISTER'],
				}),
			);

			const result = await jiraService.isAdmin(
				atlassianUserId,
				connectInstallation,
			);

			expect(result).toBe(true);
		});

		it('should throw a ForbiddenByJiraServiceError if checkPermissions returns a 403', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest
				.spyOn(jiraClient, 'checkPermissions')
				.mockRejectedValue(new ForbiddenHttpClientError());

			await expect(() =>
				jiraService.isAdmin(atlassianUserId, connectInstallation),
			).rejects.toThrow(ForbiddenByJiraServiceError);
		});

		it('should throw an error if checkPermissions returns a 500', async () => {
			const atlassianUserId = uuidv4();
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'checkPermissions').mockRejectedValue(new Error());

			await expect(() =>
				jiraService.isAdmin(atlassianUserId, connectInstallation),
			).rejects.toThrow(Error);
		});
	});
});
