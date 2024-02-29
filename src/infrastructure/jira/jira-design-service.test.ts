import { jiraClient } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import {
	jiraDesignService,
	JiraSubmitDesignServiceError,
} from './jira-design-service';

import { AtlassianAssociation } from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateJiraIssueAri,
} from '../../domain/entities/testing';

describe('JiraDesignService', () => {
	describe('submitDesigns', () => {
		const currentDate = new Date();

		beforeEach(() => {
			jest.useFakeTimers().setSystemTime(currentDate);
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should submit designs', async () => {
			const connectInstallation = generateConnectInstallation();
			const design1 = generateAtlassianDesign();
			const design2 = generateAtlassianDesign();
			const designs = [design1, design2];
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse(
				designs.map((design) => design.id),
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraDesignService.submitDesigns(
				designs.map((design) => ({ design })),
				connectInstallation,
			);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: designs.map((design) => ({
						...design,
						addAssociations: null,
						removeAssociations: null,
						associationsLastUpdated: currentDate.toISOString(),
						associationsUpdateSequenceNumber: currentDate.valueOf(),
					})),
				},
				connectInstallation,
			);
		});

		it('should truncate the display name if it is too long', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'a'.repeat(256),
			});
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse([
				design.id,
			]);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraDesignService.submitDesigns([{ design }], connectInstallation);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: [
						{
							...design,
							displayName: 'a'.repeat(254) + '…',
							addAssociations: null,
							removeAssociations: null,
							associationsLastUpdated: currentDate.toISOString(),
							associationsUpdateSequenceNumber: currentDate.valueOf(),
						},
					],
				},
				connectInstallation,
			);
		});

		it('should submit design and add/remove associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design1 = generateAtlassianDesign();
			const design2 = generateAtlassianDesign();
			const designs = [design1, design2];
			const addAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(
					generateJiraIssueAri(),
				),
			];
			const removeAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(
					generateJiraIssueAri(),
				),
			];
			const submitDesignsResponse = generateSuccessfulSubmitDesignsResponse(
				designs.map((design) => design.id),
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await jiraDesignService.submitDesigns(
				designs.map((design) => ({
					design,
					addAssociations,
					removeAssociations,
				})),
				connectInstallation,
			);

			expect(jiraClient.submitDesigns).toHaveBeenCalledWith(
				{
					designs: designs.map((design) => ({
						...design,
						addAssociations,
						removeAssociations,
						associationsLastUpdated: currentDate.toISOString(),
						associationsUpdateSequenceNumber: currentDate.valueOf(),
					})),
				},
				connectInstallation,
			);
		});

		it('should throw when design is rejected ', async () => {
			const connectInstallation = generateConnectInstallation();
			const design1 = generateAtlassianDesign();
			const design2 = generateAtlassianDesign();
			const designs = [design1, design2];
			const submitDesignsResponse = generateFailedSubmitDesignsResponse(
				designs.map((design) => design.id),
			);
			const expectedError = JiraSubmitDesignServiceError.designRejected(
				submitDesignsResponse.rejectedEntities[0].key.designId,
				submitDesignsResponse.rejectedEntities[0].errors,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraDesignService.submitDesigns(
					designs.map((design) => ({ design })),
					connectInstallation,
				),
			).rejects.toStrictEqual(expectedError);
		});

		it('should throw when there is unknown issue keys', async () => {
			const connectInstallation = generateConnectInstallation();
			const design1 = generateAtlassianDesign();
			const design2 = generateAtlassianDesign();
			const designs = [design1, design2];
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownAssociations: [],
				});
			const expectedError = JiraSubmitDesignServiceError.unknownIssueKeys(
				submitDesignsResponse.unknownIssueKeys!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraDesignService.submitDesigns(
					designs.map((design) => ({ design })),
					connectInstallation,
				),
			).rejects.toStrictEqual(expectedError);
		});

		it('should throw when there is unknown associations', async () => {
			const connectInstallation = generateConnectInstallation();
			const design1 = generateAtlassianDesign();
			const design2 = generateAtlassianDesign();
			const designs = [design1, design2];
			const submitDesignsResponse =
				generateSubmitDesignsResponseWithUnknownData({
					unknownIssueKeys: [],
				});
			const expectedError = JiraSubmitDesignServiceError.unknownAssociations(
				submitDesignsResponse.unknownAssociations!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraDesignService.submitDesigns(
					designs.map((design) => ({ design })),
					connectInstallation,
				),
			).rejects.toStrictEqual(expectedError);
		});
	});

	describe('submitDesign', () => {
		it('should call submitDesigns', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();
			const addAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(
					generateJiraIssueAri(),
				),
			];
			const removeAssociations = [
				AtlassianAssociation.createDesignIssueAssociation(
					generateJiraIssueAri(),
				),
			];

			jest
				.spyOn(jiraDesignService, 'submitDesigns')
				.mockResolvedValue(undefined);

			await jiraDesignService.submitDesign(
				{ design, addAssociations, removeAssociations },
				connectInstallation,
			);

			expect(jiraDesignService.submitDesigns).toHaveBeenCalledWith(
				[{ design, addAssociations, removeAssociations }],
				connectInstallation,
			);
		});
	});
});
