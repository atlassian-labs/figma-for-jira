import { jiraClient } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import { jiraService } from './jira-service';

import { AtlassianDesignAssociation } from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateIssueAri,
	generateJiraIssue,
} from '../../domain/entities/testing';

describe('JiraService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('submitDesign', () => {
		it('should submit design', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse(
				design.id,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraService.submitDesign(
				{
					design,
				},
				connectInstallation,
			);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: [
						{
							...design,
							addAssociations: [],
							removeAssociations: [],
						},
					],
				},
				{
					baseUrl: connectInstallation.baseUrl,
					connectAppKey: connectInstallation.key,
					connectSharedSecret: connectInstallation.sharedSecret,
				},
			);
		});

		it('should submit design and add/remove associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const addAssociations = [
				AtlassianDesignAssociation.withJiraIssue(generateIssueAri()),
			];
			const removeAssociations = [
				AtlassianDesignAssociation.withJiraIssue(generateIssueAri()),
			];
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse(
				design.id,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraService.submitDesign(
				{
					design,
					addAssociations,
					removeAssociations,
				},
				connectInstallation,
			);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: [
						{
							...design,
							addAssociations,
							removeAssociations,
						},
					],
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
			const design = generateAtlassianDesign();
			const submitDesignsResponse = generateFailedSubmitDesignsResponse(
				design.id,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
			).rejects.toThrowError();
		});

		it('should throw when there is unknown issue keys', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownAssociations: [],
				});
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
			).rejects.toThrowError();
		});

		it('should throw when there is unknown associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownIssueKeys: [],
				});
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
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
