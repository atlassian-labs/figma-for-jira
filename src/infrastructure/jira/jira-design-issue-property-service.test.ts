import { v4 as uuidv4 } from 'uuid';

import { ForbiddenByJiraServiceError } from './errors';
import { jiraClient } from './jira-client';
import { generateGetIssuePropertyResponse } from './jira-client/testing';
import {
	JiraDesignIssuePropertyService,
	jiraDesignIssuePropertyService,
} from './jira-design-issue-property-service';

import { SchemaValidationError } from '../../common/schema-validation';
import { appendToPathname } from '../../common/url-utils';
import { FigmaDesignIdentifier } from '../../domain/entities';
import {
	generateAtlassianDesign,
	generateConnectInstallation,
	generateFigmaDesignIdentifier,
	generateFigmaDesignUrl,
	generateFigmaFileKey,
	generateJiraIssueId,
} from '../../domain/entities/testing';
import {
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
} from '../http-client-errors';

const issuePropertyKeys = {
	ATTACHED_DESIGN_URL: 'attached-design-url',
	ATTACHED_DESIGN_URL_V2: 'attached-design-url-v2',
};

describe('JiraDesignIssuePropertyService', () => {
	describe('trySaveDesignUrlInIssueProperties', () => {
		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should not throw when forbidden to edit Issue Properties', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignIdToReplace = generateFigmaDesignIdentifier();
			const design = generateAtlassianDesign();
			jest
				.spyOn(
					jiraDesignIssuePropertyService,
					'setAttachedDesignUrlInIssuePropertiesIfMissing',
				)
				.mockRejectedValue(new ForbiddenByJiraServiceError());
			jest
				.spyOn(
					jiraDesignIssuePropertyService,
					'updateAttachedDesignUrlV2IssueProperty',
				)
				.mockRejectedValue(new ForbiddenByJiraServiceError());

			await expect(
				jiraDesignIssuePropertyService.trySaveDesignUrlInIssueProperties(
					issueId,
					figmaDesignIdToReplace,
					design,
					connectInstallation,
				),
			).resolves.toBeUndefined();
		});
	});

	describe('tryDeleteDesignUrlFromIssueProperties', () => {
		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should not throw when forbidden to edit Issue Properties', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest
				.spyOn(
					jiraDesignIssuePropertyService,
					'deleteAttachedDesignUrlInIssuePropertiesIfPresent',
				)
				.mockRejectedValue(new ForbiddenByJiraServiceError());
			jest
				.spyOn(
					jiraDesignIssuePropertyService,
					'deleteFromAttachedDesignUrlV2IssueProperties',
				)
				.mockRejectedValue(new ForbiddenByJiraServiceError());

			await expect(
				jiraDesignIssuePropertyService.tryDeleteDesignUrlFromIssueProperties(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).resolves.toBeUndefined();
		});
	});

	describe('setAttachedDesignUrlInIssuePropertiesIfMissing', () => {
		it('should set the Issue Property if not present', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test - Design 1',
			});
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation();

			await jiraDesignIssuePropertyService.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(design),
				connectInstallation,
			);
		});

		it('should not overwrite the Issue Property if present', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test - Design 1',
			});
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL,
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty');

			await jiraDesignIssuePropertyService.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueId,
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should throw `ForbiddenByJiraServiceError` when forbidden to set Issue Property', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test - Design 1',
			});
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest
				.spyOn(jiraClient, 'setIssueProperty')
				.mockRejectedValue(new ForbiddenHttpClientError());

			await expect(
				jiraDesignIssuePropertyService.setAttachedDesignUrlInIssuePropertiesIfMissing(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrow(ForbiddenByJiraServiceError);
		});

		it('should rethrow unknown errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test - Design 1',
			});
			const unexpectedError = new Error();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraDesignIssuePropertyService.setAttachedDesignUrlInIssuePropertiesIfMissing(
					issueId,
					design,
					connectInstallation,
				),
			).rejects.toThrow(unexpectedError);
		});
	});

	describe('updateAttachedDesignUrlV2IssueProperty', () => {
		it('should set Issue Property if not present', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							design,
						),
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should update Issue Property with item if it does not contains target', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			const issuePropertyValueItems = [
				{
					url: `https://www.figma.com/file/${uuidv4()}/Test-File`,
					name: 'Test File',
				},
			];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(issuePropertyValueItems),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...issuePropertyValueItems,
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							design,
						),
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should update Issue Property if it contains target item with URL in different format', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			const targetIssuePropertyValueItem = {
				url: design.url,
				name: design.displayName,
			};
			const otherIssuePropertyValueItems = [
				{
					url: `https://www.figma.com/file/${uuidv4()}/Test-File`,
					name: `Test File`,
				},
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						targetIssuePropertyValueItem,
						...otherIssuePropertyValueItems,
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...otherIssuePropertyValueItems,
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							design,
						),
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should update Issue Property if it contains target item with URL matching design ID to replace', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			const designId = FigmaDesignIdentifier.fromAtlassianDesignId(design.id);
			const parentDesign = generateAtlassianDesign({
				id: designId.fileKey,
				displayName: 'Test',
			});
			const targetIssuePropertyValueItem = {
				url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
					design,
				),
				name: design.displayName,
			};
			const otherIssuePropertyValueItems = [
				{
					url: `https://www.figma.com/file/${uuidv4()}/Test-File`,
					name: `Test File`,
				},
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						targetIssuePropertyValueItem,
						...otherIssuePropertyValueItems,
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				designId,
				parentDesign,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...otherIssuePropertyValueItems,
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							parentDesign,
						),
						name: parentDesign.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should update Issue Property if it contains multiple target items with URL matching design ID to replace', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			const designId = FigmaDesignIdentifier.fromAtlassianDesignId(design.id);
			const parentDesign = generateAtlassianDesign({
				id: designId.fileKey,
				displayName: 'Test',
			});
			const targetIssuePropertyValueItem = {
				url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
					design,
				),
				name: design.displayName,
			};
			const otherIssuePropertyValueItems = [
				{
					url: `https://www.figma.com/file/${uuidv4()}/Test-File`,
					name: `Test File`,
				},
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify([
						targetIssuePropertyValueItem,
						targetIssuePropertyValueItem,
						...otherIssuePropertyValueItems,
					]),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				designId,
				parentDesign,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					...otherIssuePropertyValueItems,
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							parentDesign,
						),
						name: parentDesign.displayName,
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
			'should overwrite the existing value if the Issue Property value is not in the expected shape',
			async (value) => {
				const issueId = generateJiraIssueId();
				const connectInstallation = generateConnectInstallation();
				const design = generateAtlassianDesign({
					displayName: 'Test / Design 1',
				});
				jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
					generateGetIssuePropertyResponse({
						key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(value),
					}),
				);
				jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

				await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
					issueId,
					FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
					design,
					connectInstallation,
				);

				expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
					issueId,
					issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					JSON.stringify([
						{
							url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
								design,
							),
							name: design.displayName,
						},
					]),
					connectInstallation,
				);
			},
		);

		it('should overwrite with the new value if the Issue Property value received from Jira is not a string', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse({ value: 1 }));
			jest.spyOn(jiraClient, 'setIssueProperty').mockResolvedValue();

			await jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
				issueId,
				FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				design,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([
					{
						url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							design,
						),
						name: design.displayName,
					},
				]),
				connectInstallation,
			);
		});

		it('should throw `ForbiddenByJiraServiceError` when forbidden to set Issue Property', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(new NotFoundHttpClientError());
			jest
				.spyOn(jiraClient, 'setIssueProperty')
				.mockRejectedValue(new ForbiddenHttpClientError());

			await expect(
				jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
					issueId,
					FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
					design,
					connectInstallation,
				),
			).rejects.toThrow(ForbiddenByJiraServiceError);
		});

		it('should rethrow unknown errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const design = generateAtlassianDesign({
				displayName: 'Test / Design 1',
			});
			const unexpectedError = new Error();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraDesignIssuePropertyService.updateAttachedDesignUrlV2IssueProperty(
					issueId,
					FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
					design,
					connectInstallation,
				),
			).rejects.toThrow(unexpectedError);
		});
	});

	describe('deleteAttachedDesignUrlInIssuePropertiesIfPresent', () => {
		it('should delete Issue Property if its value is URL of given design', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					value: appendToPathname(
						generateFigmaDesignUrl(figmaDesignId),
						'Test-Design',
					).toString(),
				}),
			);
			jest
				.spyOn(jiraClient, 'deleteIssueProperty')
				.mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
				issueId,
				figmaDesignId,
				connectInstallation,
			);

			expect(jiraClient.deleteIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		});

		it('should delete Issue Property if its value is not URL of given design', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(
					generateGetIssuePropertyResponse({ value: 'https://random-url.com' }),
				);
			jest
				.spyOn(jiraClient, 'deleteIssueProperty')
				.mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
				issueId,
				figmaDesignId,
				connectInstallation,
			);

			expect(jiraClient.deleteIssueProperty).not.toHaveBeenCalled();
		});

		it('should rethrow unknown errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const unexpectedError = new Error();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraDesignIssuePropertyService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).rejects.toThrow(unexpectedError);
		});

		it('should not rethrow NotFoundHttpClientError errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const notFoundError = new NotFoundHttpClientError();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(notFoundError);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraDesignIssuePropertyService.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).resolves.not.toThrow(notFoundError);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});
	});

	describe('deleteFromAttachedDesignUrlV2IssueProperties', () => {
		it('should delete the URL from the array stored in Issue Properties', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const anotherFigmaDesignId = generateFigmaDesignIdentifier();
			const anotherDesignPropertyValue = {
				url: generateFigmaDesignUrl(anotherFigmaDesignId),
				name: 'Another Design',
			};
			const targetFigmaDesignId = generateFigmaDesignIdentifier();
			const targetDesignPropertyValue = {
				url: generateFigmaDesignUrl(targetFigmaDesignId),
				name: 'Target Design',
			};
			const attachedDesignPropertyValues = [
				anotherDesignPropertyValue,
				targetDesignPropertyValue,
			];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				targetFigmaDesignId,
				connectInstallation,
			);

			expect(jiraClient.setIssueProperty).toHaveBeenCalledWith(
				issueId,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				JSON.stringify([anotherDesignPropertyValue]),
				connectInstallation,
			);
		});

		it('should not set issue properties again if the array remained unchanged', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const targetFigmaDesignId = generateFigmaDesignIdentifier();
			const designPropertyValue = {
				url: generateFigmaDesignUrl(),
				name: 'Another Design',
			};
			const attachedDesignPropertyValues = [designPropertyValue];

			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
				issueId,
				targetFigmaDesignId,
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
			'should throw a validation error if the Issue Property value is not in the expected shape',
			async (value) => {
				const issueId = generateJiraIssueId();
				const connectInstallation = generateConnectInstallation();
				const figmaDesignId = generateFigmaDesignIdentifier();
				jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
					generateGetIssuePropertyResponse({
						key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
						value: JSON.stringify(value),
					}),
				);

				await expect(
					jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
						issueId,
						figmaDesignId,
						connectInstallation,
					),
				).rejects.toThrow(SchemaValidationError);
			},
		);

		it('should throw if the Issue Property value received from Jira is not a string', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockResolvedValue(generateGetIssuePropertyResponse({ value: 1 }));
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).rejects.toThrow(
				'The provided value is not of the correct type. Expected string, but received: number',
			);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});

		it('should throw `ForbiddenByJiraServiceError` when forbidden to set Issue Property', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const designPropertyValue = {
				url: generateFigmaDesignUrl(figmaDesignId),
				name: 'Target Design',
			};
			const attachedDesignPropertyValues = [designPropertyValue];
			jest.spyOn(jiraClient, 'getIssueProperty').mockResolvedValue(
				generateGetIssuePropertyResponse({
					key: issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					value: JSON.stringify(attachedDesignPropertyValues),
				}),
			);
			jest
				.spyOn(jiraClient, 'setIssueProperty')
				.mockRejectedValue(new ForbiddenHttpClientError());

			await expect(
				jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).rejects.toThrow(ForbiddenByJiraServiceError);
		});

		it('should rethrow unknown errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const unexpectedError = new Error();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(unexpectedError);

			await expect(
				jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).rejects.toThrow(unexpectedError);
		});

		it('should not rethrow NotFoundHttpClientError errors', async () => {
			const issueId = generateJiraIssueId();
			const connectInstallation = generateConnectInstallation();
			const figmaDesignId = generateFigmaDesignIdentifier();
			const notFoundError = new NotFoundHttpClientError();
			jest
				.spyOn(jiraClient, 'getIssueProperty')
				.mockRejectedValue(notFoundError);
			jest.spyOn(jiraClient, 'setIssueProperty').mockImplementation(jest.fn());

			await expect(
				jiraDesignIssuePropertyService.deleteFromAttachedDesignUrlV2IssueProperties(
					issueId,
					figmaDesignId,
					connectInstallation,
				),
			).resolves.not.toThrow(notFoundError);

			expect(jiraClient.setIssueProperty).not.toHaveBeenCalled();
		});
	});

	describe('buildDesignUrlForIssueProperties', () => {
		it('should return URL with encoded design name', () => {
			const fileKey = generateFigmaFileKey();
			const design = generateAtlassianDesign({
				id: fileKey,
				url: `https://www.figma.com/file/${fileKey}`,
				displayName: 'Test / Design - 1',
			});

			const result =
				JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(design);

			expect(result).toBe(
				`https://www.figma.com/file/${fileKey}/Test%20%2F%20Design%20%2D%201`,
			);
		});
	});
});
