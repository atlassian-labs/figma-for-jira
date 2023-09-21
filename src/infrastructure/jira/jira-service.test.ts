import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';

import { JiraServiceSubmitDesignError } from './errors';
import { jiraClient, JiraClientNotFoundError } from './jira-client';
import {
	generateFailedSubmitDesignsResponse,
	generateGetIssuePropertyResponse,
	generateSubmitDesignsResponseWithUnknownData,
	generateSuccessfulSubmitDesignsResponse,
} from './jira-client/testing';
import type { AttachedDesignUrlV2IssuePropertyValue } from './jira-service';
import { jiraService, propertyKeys } from './jira-service';

import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../domain/entities';
import { AtlassianAssociation } from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateJiraIssue,
	generateJiraIssueAri,
} from '../../domain/entities/testing';
import { SchemaValidationError } from '../ajv';

describe('JiraService', () => {
	describe('submitDesigns', () => {
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
			const expectedError = JiraServiceSubmitDesignError.designRejected(
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
			const expectedError = JiraServiceSubmitDesignError.unknownIssueKeys(
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
			const expectedError = JiraServiceSubmitDesignError.unknownAssociations(
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

	describe('deleteDesign', () => {
		it('should delete design', async () => {
			const designId = generateFigmaDesignIdentifier();
			const connectInstallation = generateConnectInstallation();
			jest.spyOn(jiraClient, 'deleteDesign').mockResolvedValue(designId);

			const result = await jiraService.deleteDesign(
				designId,
				connectInstallation,
			);

			expect(result).toBe(designId);
			expect(jiraClient.deleteDesign).toHaveBeenCalledWith(
				designId,
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
			design = generateAtlassianDesign();
		});

		it('should set the issue property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new JiraClientNotFoundError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				propertyKeys.ATTACHED_DESIGN_URL,
				design.url,
				connectInstallation,
			);
		});

		it('should not overwrite the issue property if present', async () => {
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL,
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
		const issueId = 'TEST-1';
		let connectInstallation: ConnectInstallation;
		let design: AtlassianDesign;

		beforeEach(() => {
			connectInstallation = generateConnectInstallation();
			design = generateAtlassianDesign();
		});

		it('should set the issue property if not present', async () => {
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new JiraClientNotFoundError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			const expectedIssuePropertyValue = JSON.stringify(
				JSON.stringify([
					{
						url: design.url,
						name: design.displayName,
					},
				]),
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				expectedIssuePropertyValue,
				connectInstallation,
			);
		});

		it('should add to the issue property url array if more than one design is linked', async () => {
			const attachedDesignPropertyValues: AttachedDesignUrlV2IssuePropertyValue[] =
				[
					{
						url: 'https://www.figma.com/file/UcmoEBi9SyNOX3SNhXqShY/test-file',
						name: 'test-file',
					},
				];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				design,
				connectInstallation,
			);

			const expectedIssuePropertyValue = JSON.stringify(
				JSON.stringify([
					...attachedDesignPropertyValues,
					{
						url: design.url,
						name: design.displayName,
					},
				]),
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				expectedIssuePropertyValue,
				connectInstallation,
			);
		});

		it('should not update the issue property url array if the design has already been linked', async () => {
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
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
						key: propertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(value),
					}),
				);

				await expect(
					jiraService.updateAttachedDesignUrlV2IssueProperty(
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
				jiraService.updateAttachedDesignUrlV2IssueProperty(
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
				jiraService.updateAttachedDesignUrlV2IssueProperty(
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

		it('should delete the URL stored in issue properties if it is the one requested to be deleted', async () => {
			const urlToDelete = 'https://test-url.com';
			design = generateAtlassianDesign({ url: urlToDelete });
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(
					generateGetIssuePropertyResponse({ value: urlToDelete }),
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
				propertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		});

		it('should not delete the URL stored in issue properties if it does not match the one requested to be deleted', async () => {
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

		it('should not rethrow JiraClientNotFound errors', async () => {
			const notFoundError = new JiraClientNotFoundError();
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
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				designToDelete,
				connectInstallation,
			);

			const expectedIssuePropertyValue = JSON.stringify(
				JSON.stringify([designPropertyValue]),
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				expectedIssuePropertyValue,
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
					key: propertyKeys.ATTACHED_DESIGN_URL_V2,
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
						key: propertyKeys.ATTACHED_DESIGN_URL_V2,
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

		it('should not rethrow JiraClientNotFound errors', async () => {
			const notFoundError = new JiraClientNotFoundError();
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
});
