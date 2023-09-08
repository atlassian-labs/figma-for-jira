import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';

import { JiraServiceSubmitDesignError } from './errors';
import { jiraClient } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateGetIssuePropertyResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import { jiraService } from './jira-service';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../domain/entities';
import { AtlassianAssociation } from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateIssueAri,
	generateJiraIssue,
} from '../../domain/entities/testing';

describe('JiraService', () => {
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
				connectInstallation,
			);
		});

		it('should submit design and add/remove associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const addAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(generateIssueAri()),
			];
			const removeAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(generateIssueAri()),
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
				connectInstallation,
			);
		});

		it('should throw when design is rejected ', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse = generateFailedSubmitDesignsResponse(
				design.id,
			);
			const expectedError = JiraServiceSubmitDesignError.designRejected(
				submitDesignsResponse.rejectedEntities[0].key.designId,
				submitDesignsResponse.rejectedEntities[0].errors,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
			).rejects.toStrictEqual(expectedError);
		});

		it('should throw when there is unknown issue keys', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownAssociations: [],
				});
			const expectedError = JiraServiceSubmitDesignError.unknownIssueKeys(
				submitDesignsResponse.unknownIssueKeys!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
			).rejects.toStrictEqual(expectedError);
		});

		it('should throw when there is unknown associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownIssueKeys: [],
				});
			const expectedError = JiraServiceSubmitDesignError.unknownAssociations(
				submitDesignsResponse.unknownAssociations!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesign({ design }, connectInstallation),
			).rejects.toStrictEqual(expectedError);
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
			expect(jiraClient.getIssue).toHaveBeenCalledWith(
				jiraIssue.key,
				connectInstallation,
			);
		});
	});

	describe('setAttachedDesignUrlInIssueProperties', () => {
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign();
		});

		it('should set the attached-design-url property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(
					new AxiosError(
						'Not found.',
						HttpStatusCode.NotFound.toString(),
						undefined,
						undefined,
						{ status: HttpStatusCode.NotFound } as AxiosResponse,
					),
				);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.setAttachedDesignUrlInIssueProperties(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				'attached-design-url',
				design.url,
				connectInstallation,
			);
		});

		it('should not overwrite the attached-design-url property if present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse());
			jest.spyOn(jiraClient, 'setIssueProperty');

			await jiraService.setAttachedDesignUrlInIssueProperties(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});
	});

	describe('setAttachedDesignUrlV2InIssueProperties', () => {
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign();
		});

		it('should set the attached-design-url-v2 property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(
					new AxiosError(
						'Not found.',
						HttpStatusCode.NotFound.toString(),
						undefined,
						undefined,
						{ status: HttpStatusCode.NotFound } as AxiosResponse,
					),
				);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.setAttachedDesignUrlV2InIssueProperties(
				issueId,
				design,
				connectInstallation,
			);

			const expectedIssuePropertyValue = JSON.stringify([
				{
					url: design.url,
					name: design.displayName,
				},
			]);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				'attached-design-url-v2',
				expectedIssuePropertyValue,
				connectInstallation,
			);
		});

		it('should add to the attached-design-url-v2 property url array if more than one design is linked', async () => {
			const attachedDesignPropertyValue = [
				{
					url: 'https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/test-file',
					name: 'test-file',
				},
			];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: 'attached-design-url-v2',
					value: JSON.stringify(attachedDesignPropertyValue),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.setAttachedDesignUrlV2InIssueProperties(
				issueId,
				design,
				connectInstallation,
			);

			const expectedIssuePropertyValue = JSON.stringify([
				...attachedDesignPropertyValue,
				{
					url: design.url,
					name: design.displayName,
				},
			]);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				'attached-design-url-v2',
				expectedIssuePropertyValue,
				connectInstallation,
			);
		});
	});
});
