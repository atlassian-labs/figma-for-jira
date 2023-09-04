import { jiraClient } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import { jiraService } from './jira-service';

import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateJiraIssue,
} from '../../domain/entities/testing';

describe('JiraService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('submitDesign', () => {
		it('should submit design', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianDesign = generateAtlassianDesign();
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse(
				atlassianDesign.id,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraService.submitDesign(atlassianDesign, connectInstallation);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: [atlassianDesign],
				},
				{
					baseUrl: connectInstallation.baseUrl,
					connectAppKey: connectInstallation.key,
					connectSharedSecret: connectInstallation.sharedSecret,
				},
			);
		});

		it('should throw when design is rejected ', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianDesign = generateAtlassianDesign();
			const submitDesignsResponse = generateFailedSubmitDesignsResponse(
				atlassianDesign.id,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign(atlassianDesign, connectInstallation),
			).rejects.toThrowError();
		});

		it('should throw when there is unknown issue keys', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianDesign = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownAssociations: [],
				});
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign(atlassianDesign, connectInstallation),
			).rejects.toThrowError();
		});

		it('should throw when there is unknown associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const atlassianDesign = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownIssueKeys: [],
				});
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign(atlassianDesign, connectInstallation),
			).rejects.toThrowError();
		});
	});

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
			expect(jiraClient.getIssue).toHaveBeenCalledWith(jiraIssue.key, {
				baseUrl: connectInstallation.baseUrl,
				connectAppKey: connectInstallation.key,
				connectSharedSecret: connectInstallation.sharedSecret,
			});
		});
	});
});
