import { jiraClient } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import {
	jiraDesignService,
	JiraSubmitDesignServiceError,
} from './jira-design-service';

import {
	generateAtlassianDesign,
	generateConnectInstallation,
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
	});

	describe('submitDesign', () => {
		it('should call submitDesigns', async () => {
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign();

			jest
				.spyOn(jiraDesignService, 'submitDesigns')
				.mockResolvedValue(undefined);

			await jiraDesignService.submitDesign({ design }, connectInstallation);

			expect(jiraDesignService.submitDesigns).toHaveBeenCalledWith(
				[{ design }],
				connectInstallation,
			);
		});
	});
});
