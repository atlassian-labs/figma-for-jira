import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { jiraClient } from './jira-client';
import {
	generateCheckPermissionsResponse,
	generateFailedSubmitDesignsResponse,
	generateGetIssuePropertyResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import type {
	AttachedDesignUrlV2IssuePropertyValue,
	IngestedDesignUrlIssuePropertyValue,
} from './jira-service';
import {
	ConfigurationState,
	issuePropertyKeys,
	jiraService,
	SubmitDesignJiraServiceError,
} from './jira-service';

import { SchemaValidationError } from '../../common/schema-validation';
import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateJiraIssue,
	generateJiraIssueAri,
	generateJiraIssueKey,
} from '../../domain/entities/testing';
import { NotFoundHttpClientError } from '../http-client-errors';

describe('JiraService', () => {
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

			await jiraService.submitDesigns(
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

			await jiraService.submitDesigns(
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
			const expectedError = SubmitDesignJiraServiceError.designRejected(
				submitDesignsResponse.rejectedEntities[0].key.designId,
				submitDesignsResponse.rejectedEntities[0].errors,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesigns(
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
			const expectedError = SubmitDesignJiraServiceError.unknownIssueKeys(
				submitDesignsResponse.unknownIssueKeys!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesigns(
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
			const expectedError = SubmitDesignJiraServiceError.unknownAssociations(
				submitDesignsResponse.unknownAssociations!,
			);
			jest
				.spyOn(jiraClient, 'submitDesigns')
				.mockResolvedValue(submitDesignsResponse);

			await expect(() =>
				jiraService.submitDesigns(
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

			jest.spyOn(jiraService, 'submitDesigns').mockResolvedValue(undefined);

			await jiraService.submitDesign(
				{ design, addAssociations, removeAssociations },
				connectInstallation,
			);

			expect(jiraService.submitDesigns).toBeCalledWith(
				[{ design, addAssociations, removeAssociations }],
				connectInstallation,
			);
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

	describe('setAttachedDesignUrlInIssuePropertiesIfMissing', () => {
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign({
				displayName: 'Test - Design 1',
			});
		});

		it('should set the issue property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueId,
				design,
				connectInstallation,
			);

			const expectedValue = new URL(design.url);
			expectedValue.pathname += `/Test%20%2D%20Design%201`;

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				expectedValue.toString(),
				connectInstallation,
			);
		});

		it('should not overwrite the issue property if present', async () => {
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty');

			await jiraService.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should rethrow unknown errors', async () => {
			const unexpectedError = new AxiosError(
				'Forbidden.',
				HttpStatusCode.Forbidden.toString(),
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraService.setAttachedDesignUrlInIssuePropertiesIfMissing(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(unexpectedError);
		});
	});

	describe('updateAttachedDesignUrlV2IssueProperty', () => {
		const issueId = generateJiraIssueKey();
		const connectInstallation = generateConnectInstallation();
		const design = generateAtlassianDesign();

		it('should set the issue property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					{
						url: design.url,
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should add to the issue property if it contains other items', async () => {
			const attachedDesignPropertyValueItems: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{
						url: `https://www.figma.com/file/${uuidv4()}/test-file`,
						name: 'test-file',
					},
				];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValueItems),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...attachedDesignPropertyValueItems,
					{
						url: design.url,
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should not update the issue property if it contains target item', async () => {
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						{
							url: `https://www.figma.com/file/${uuidv4()}/test-file`,
							name: `Design ${uuidv4()}`,
						},
						{ url: design.url, name: design.displayName },
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should overwrite the issue property if it contains item with URL in different format', async () => {
			const designUrlInDifferentFormat = generateFigmaDesignUrl({
				fileKey: FigmaDesignIdentifier.fromAtlassianDesignId(design.id).fileKey,
				nodeId: FigmaDesignIdentifier.fromAtlassianDesignId(design.id).nodeId,
				mode: 'dev',
			});
			const otherDesignPropertyValue: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{
						url: `https://www.figma.com/file/${uuidv4()}/test-file`,
						name: `Design ${uuidv4()}`,
					},
				];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						...otherDesignPropertyValue,
						{ url: designUrlInDifferentFormat, name: design.displayName },
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...otherDesignPropertyValue,
					{
						url: design.url,
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should overwrite the issue property if it contains item with same URL but different name', async () => {
			const otherDesignPropertyValueItems: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{
						url: `https://www.figma.com/file/${uuidv4()}/test-file`,
						name: `Design ${uuidv4()}`,
					},
					{
						url: `https://www.figma.com/file/${uuidv4()}/test-file`,
						name: design.displayName,
					},
				];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						...otherDesignPropertyValueItems,
						{ url: design.url, name: `Design ${uuidv4()}` },
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...otherDesignPropertyValueItems,
					{
						url: design.url,
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it.each([
			1,
			null,
			{ name: 'test', url: 'url' },
			[{ name: 'test-no-url' }],
			[{ url: 'test-no-name' }],
		])(
			'should overwrite the existing value if the issue property value is not in the expected shape',
			async (value) => {
				jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
					generateGetIssuePropertyResponse({
						key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(value),
					}),
				);
				jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

				await jiraService.updateAttachedDesignUrlV2IssueProperty(
					issueId,
					design,
					connectInstallation,
				);

				expect(jiraClient.setIssueProperty).toBeCalledWith(
					issueId,
					issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					JSON.stringify([
						{
							url: design.url,
							name: design.displayName,
						},
					]),
					connectInstallation,
				);
			},
		);

		it('should overwrite with the new value if the issue property value received from jira is not a string', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse({ value: 1 }));
			jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toBeCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					{
						url: design.url,
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should rethrow unknown errors', async () => {
			const unexpectedError = new AxiosError(
				'Forbidden.',
				HttpStatusCode.Forbidden.toString(),
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraService.updateAttachedDesignUrlV2IssueProperty(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(unexpectedError);
		});
	});

	describe('updateIngestedDesignsIssueProperty', () => {
		const issueId = generateJiraIssueKey();
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign();
		});

		it('should set the issue property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateIngestedDesignsIssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.INGESTED_DESIGN_URLS,
				[design.url],
				connectInstallation,
			);
		});

		it('should add to the issue property url array if ingested designs already exist', async () => {
			const ingestedDesignPropertyValues: IngestedDesignUrlIssuePropertyValue[] =
				['https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/test-file'];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.INGESTED_DESIGN_URLS,
					value: ingestedDesignPropertyValues,
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateIngestedDesignsIssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.INGESTED_DESIGN_URLS,
				[...ingestedDesignPropertyValues, design.url],
				connectInstallation,
			);
		});

		it('should not update the ingested designs issue property if the exact design url already exists', async () => {
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.INGESTED_DESIGN_URLS,
					value: [design.url],
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateIngestedDesignsIssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should overwrite the ingested designs issue property if the same design with a different url format already exists', async () => {
			const designUrlInDifferentFormat = generateFigmaDesignUrl({
				fileKey: FigmaDesignIdentifier.fromAtlassianDesignId(design.id).fileKey,
				nodeId: FigmaDesignIdentifier.fromAtlassianDesignId(design.id).nodeId,
				mode: 'dev',
			});

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.INGESTED_DESIGN_URLS,
					value: [designUrlInDifferentFormat],
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateIngestedDesignsIssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toBeCalledWith(
				issueId,
				issuePropertyKeys.INGESTED_DESIGN_URLS,
				[design.url],
				connectInstallation,
			);
		});

		it.each([1, [1], null, { url: 'url' }])(
			'should overwrite the existing value if the issue property value is not in the expected shape',
			async (value) => {
				jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
					generateGetIssuePropertyResponse({
						key: issuePropertyKeys.INGESTED_DESIGN_URLS,
						value: value,
					}),
				);
				jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

				await jiraService.updateIngestedDesignsIssueProperty(
					issueId,
					design,
					connectInstallation,
				);

				expect(jiraClient.setIssueProperty).toBeCalledWith(
					issueId,
					issuePropertyKeys.INGESTED_DESIGN_URLS,
					[design.url],
					connectInstallation,
				);
			},
		);

		it('should overwrite with the new value if the issue property value received from jira is not a string', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse({ value: 1 }));
			jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

			await jiraService.updateIngestedDesignsIssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toBeCalledWith(
				issueId,
				issuePropertyKeys.INGESTED_DESIGN_URLS,
				[design.url],
				connectInstallation,
			);
		});

		it('should rethrow unknown errors', async () => {
			const unexpectedError = new AxiosError(
				'Forbidden.',
				HttpStatusCode.Forbidden.toString(),
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraService.updateIngestedDesignsIssueProperty(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(unexpectedError);
		});
	});

	describe('deleteAttachedDesignUrlInIssuePropertiesIfPresent', () => {
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
		});

		it('should delete issue property if its value is URL of given design', async () => {
			const fileKey = generateFigmaFileKey();
			design = generateAtlassianDesign({
				id: new FigmaDesignIdentifier(fileKey).toAtlassianDesignId(),
				url: generateFigmaDesignUrl({ fileKey }),
			});
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					value: `${generateFigmaDesignUrl({ fileKey })}/Test-Design?mode=dev`,
				}),
			);
			jest
				.spyOn(jiraClient, 'deleteIssueProperty')
				.mockImplementation(jest.fn());

			await jiraService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.deleteIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		});

		it('should delete issue property if its value is not URL of given design', async () => {
			design = generateAtlassianDesign();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(
					generateGetIssuePropertyResponse({ value: 'https://random-url.com' }),
				);
			jest
				.spyOn(jiraClient, 'deleteIssueProperty')
				.mockImplementation(jest.fn());

			await jiraService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.deleteIssueProperty).not.toHaveBeenCalled();
		});

		it('should rethrow unknown errors', async () => {
			const unexpectedError = new AxiosError(
				'Forbidden.',
				HttpStatusCode.Forbidden.toString(),
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(unexpectedError);
		});

		it('should not rethrow NotFoundHttpClientError errors', async () => {
			const notFoundError = new NotFoundHttpClientError();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(notFoundError);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
					issueId,
					design,
					connectInstallation,
				),
			).resolves.not.toThrowError(notFoundError);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});
	});

	describe('deleteFromAttachedDesignUrlV2IssueProperties', () => {
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign();
		});

		it('should delete the URL from the array stored in issue properties', async () => {
			const designToDelete = generateAtlassianDesign();
			const designPropertyValue: AttachedDesignUrlV2IssuePropertyValue = {
				url: design.url,
				name: design.displayName,
			};
			const designToDeletePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
				{ url: designToDelete.url, name: designToDelete.displayName };
			const attachedDesignPropertyValues = [
				designPropertyValue,
				designToDeletePropertyValue,
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				designToDelete,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([designPropertyValue]),
				connectInstallation,
			);
		});

		it('should delete the URL from the array stored in issue properties if in a different format', async () => {
			const designToDelete = generateAtlassianDesign();
			const designPropertyValue: AttachedDesignUrlV2IssuePropertyValue = {
				url: design.url,
				name: design.displayName,
			};
			const designToDeletePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
				{
					url: `${designToDelete.url}&mode=dev`,
					name: designToDelete.displayName,
				};

			const attachedDesignPropertyValues = [
				designPropertyValue,
				designToDeletePropertyValue,
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				designToDelete,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([designPropertyValue]),
				connectInstallation,
			);
		});

		it('should not set issue properties again if the array remained unchanged', async () => {
			const designToDelete = generateAtlassianDesign();
			const designPropertyValue: AttachedDesignUrlV2IssuePropertyValue = {
				url: design.url,
				name: design.displayName,
			};
			const attachedDesignPropertyValues = [designPropertyValue];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				designToDelete,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it.each([
			1,
			null,
			{ name: 'test', url: 'url' },
			[{ name: 'test-no-url' }],
			[{ url: 'test-no-name' }],
		])(
			'should throw a validation error if the issue property value is not in the expected shape',
			async (value) => {
				jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
					generateGetIssuePropertyResponse({
						key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(value),
					}),
				);

				await expect(
					jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
						issueId,
						design,
						connectInstallation,
					),
				).rejects.toThrowError(SchemaValidationError);
			},
		);

		it('should throw if the issue property value received from jira is not a string', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse({ value: 1 }));
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(
				'The provided value is not of the correct type. Expected string, but received: number',
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should rethrow unknown errors', async () => {
			const unexpectedError = new AxiosError(
				'Forbidden.',
				HttpStatusCode.Forbidden.toString(),
				undefined,
				undefined,
				{
					status: HttpStatusCode.Forbidden,
				} as AxiosResponse,
			);
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrowError(unexpectedError);
		});

		it('should not rethrow NotFoundHttpClientError errors', async () => {
			const notFoundError = new NotFoundHttpClientError();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(notFoundError);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					design,
					connectInstallation,
				),
			).resolves.not.toThrowError(notFoundError);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});
	});

	describe('setAppConfigurationState', () => {
		it('should set configuration state in app properties', async () => {
			const configurationState = ConfigurationState.CONFIGURED;
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'setAppProperty').mockResolvedValue(undefined);

			await jiraService.setAppConfigurationState(
				configurationState,
				connectInstallation,
			);

			expect(jiraClient.setAppProperty).toHaveBeenCalledWith(
				'is-configured',
				{ isConfigured: configurationState },
				connectInstallation,
			);
		});
	});

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

		it('should return false if user has ADMINISTER permission', async () => {
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
	});
});
