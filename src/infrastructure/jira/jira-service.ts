import type {
	GetIssuePropertyResponse,
	SubmitDesignsResponse,
} from './jira-client';
import { jiraClient } from './jira-client';
import { ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA } from './schemas';

import { CauseAwareError } from '../../common/errors';
import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import {
	assertSchema,
	parseJsonOfSchema,
	SchemaValidationError,
} from '../../common/schema-validation';
import { ensureString, isString, truncate } from '../../common/string-utils';
import { appendToPathname } from '../../common/url-utils';
import type {
	AtlassianDesign,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import {
	AtlassianAssociation,
	FigmaDesignIdentifier,
} from '../../domain/entities';
import {
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
} from '../http-client-errors';
import { getLogger } from '../logger';

type SubmitDesignParams = {
	readonly design: AtlassianDesign;
	readonly addAssociations?: AtlassianAssociation[];
	readonly removeAssociations?: AtlassianAssociation[];
};

export type AttachedDesignUrlV2IssuePropertyValue = {
	readonly url: string;
	readonly name: string;
}[];

export const appPropertyKeys = {
	CONFIGURATION_STATE: 'is-configured',
};

export enum ConfigurationState {
	CONFIGURED = 'CONFIGURED',
	NOT_CONFIGURED = 'NOT_CONFIGURED',
}

export const issuePropertyKeys = {
	ATTACHED_DESIGN_URL: 'attached-design-url',
	ATTACHED_DESIGN_URL_V2: 'attached-design-url-v2',
};

export const JIRA_ADMIN_GLOBAL_PERMISSION = 'ADMINISTER';

export class JiraService {
	/**
	 * @throws {SubmitDesignJiraServiceError} Design submission fails.
	 */
	submitDesign = async (
		params: SubmitDesignParams,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		return this.submitDesigns([params], connectInstallation);
	};

	/**
	 * @throws {SubmitDesignJiraServiceError} Design submission fails.
	 */
	submitDesigns = async (
		designs: SubmitDesignParams[],
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const associationsLastUpdated = new Date();

		// Jira does not allow display names longer than 255 characters.
		const MAX_DISPLAY_NAME_LENGTH = 255;
		const response = await jiraClient.submitDesigns(
			{
				designs: designs.map(
					({ design, addAssociations, removeAssociations }) => ({
						...design,
						displayName: truncate(design.displayName, MAX_DISPLAY_NAME_LENGTH),
						addAssociations: addAssociations ?? null,
						removeAssociations: removeAssociations ?? null,
						associationsLastUpdated: associationsLastUpdated.toISOString(),
						associationsUpdateSequenceNumber: associationsLastUpdated.valueOf(),
					}),
				),
			},
			connectInstallation,
		);

		this.throwIfSubmitDesignResponseHasErrors(response);
	};

	/**
	 * @throws {IssueNotFoundJiraServiceError} Issue does not exist or the app does not have permission to read it.
	 */
	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<JiraIssue> => {
		try {
			return await jiraClient.getIssue(issueIdOrKey, connectInstallation);
		} catch (e) {
			if (e instanceof NotFoundHttpClientError) {
				throw new IssueNotFoundJiraServiceError('Issue is not found.', e);
			}

			throw e;
		}
	};

	/**
	 * @throws {ForbiddenByJiraServiceError} The app does not have permission to edit the issue.
	 */
	saveDesignUrlInIssueProperties = async (
		issueIdOrKey: string,
		figmaDesignIdToReplace: FigmaDesignIdentifier,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			await Promise.all([
				this.setAttachedDesignUrlInIssuePropertiesIfMissing(
					issueIdOrKey,
					design,
					connectInstallation,
				),
				this.updateAttachedDesignUrlV2IssueProperty(
					issueIdOrKey,
					figmaDesignIdToReplace,
					design,
					connectInstallation,
				),
			]);
		} catch (e) {
			if (e instanceof ForbiddenHttpClientError) {
				throw new ForbiddenByJiraServiceError('Forbidden.', e);
			}

			throw e;
		}
	};

	deleteDesignUrlInIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		await Promise.all([
			await this.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
				issueIdOrKey,
				design,
				connectInstallation,
			),
			await this.deleteFromAttachedDesignUrlV2IssueProperties(
				issueIdOrKey,
				design,
				connectInstallation,
			),
		]);
	};

	setAppConfigurationState = async (
		configurationState: ConfigurationState,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		return await jiraClient.setAppProperty(
			appPropertyKeys.CONFIGURATION_STATE,
			{ isConfigured: configurationState },
			connectInstallation,
		);
	};

	deleteAppConfigurationState = async (
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			return await jiraClient.deleteAppProperty(
				appPropertyKeys.CONFIGURATION_STATE,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof NotFoundHttpClientError) {
				return; // Swallow not found errors
			} else {
				throw error;
			}
		}
	};

	isAdmin = async (
		atlassianUserId: string,
		connectInstallation: ConnectInstallation,
	): Promise<boolean> => {
		try {
			const response = await jiraClient.checkPermissions(
				{
					accountId: atlassianUserId,
					globalPermissions: [JIRA_ADMIN_GLOBAL_PERMISSION],
				},
				connectInstallation,
			);
			return response.globalPermissions.includes(JIRA_ADMIN_GLOBAL_PERMISSION);
		} catch (err) {
			if (err instanceof ForbiddenHttpClientError) {
				throw new ForbiddenByJiraServiceError();
			}
			throw err;
		}
	};

	/**
	 * @internal
	 * Only visible for testing. Please use {@link saveDesignUrlInIssueProperties}
	 */
	// TODO: Consider removing this method after deprecating the previous version of
	//  "Figma for Jira" (which is included in this app as the fallback).
	//  It should be safe to do so since:
	//  - The "Jira" widget reads from `attached-design-url-v2`
	//  - The previous version of the "Figma for Jira" did not set `attached-design-url` anyway
	setAttachedDesignUrlInIssuePropertiesIfMissing = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			await jiraClient.getIssueProperty(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof NotFoundHttpClientError) {
				const value = JiraService.buildDesignUrlForIssueProperties(design);

				await jiraClient.setIssueProperty(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL,
					value,
					connectInstallation,
				);
			} else {
				throw error;
			}
		}
	};

	/**
	 * @internal
	 * Only visible for testing. Please use {@link saveDesignUrlInIssueProperties}
	 */
	updateAttachedDesignUrlV2IssueProperty = async (
		issueIdOrKey: string,
		figmaDesignIdToReplace: FigmaDesignIdentifier,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const storedValue =
			await this.getIssuePropertyJsonValue<AttachedDesignUrlV2IssuePropertyValue>(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
				ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA,
			);

		const newItem = {
			url: JiraService.buildDesignUrlForIssueProperties(design),
			name: design.displayName,
		};

		const newValue =
			storedValue?.filter(
				(item) => !this.isUrlForDesign(item.url, figmaDesignIdToReplace),
			) || [];

		newValue.push(newItem);

		return jiraClient.setIssueProperty(
			issueIdOrKey,
			issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
			// Stringify the value twice for backwards compatibility (once here and once by `JiraClient.setIssueProperty`)
			JSON.stringify(newValue),
			connectInstallation,
		);
	};

	/**
	 * @internal
	 * Only visible for testing. Please use {@link deleteDesignUrlInIssueProperties}
	 */
	deleteAttachedDesignUrlInIssuePropertiesIfPresent = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			const response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);

			const storedUrl = response.value;

			if (!isString(storedUrl)) return;
			if (!this.areUrlsOfSameDesign(storedUrl, design.url)) return;

			await jiraClient.deleteIssueProperty(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof NotFoundHttpClientError) {
				return; // Swallow not found errors
			}
			throw error;
		}
	};

	/**
	 * @internal
	 * Only visible for testing. Please use {@link saveDesignUrlInIssueProperties}
	 */
	deleteFromAttachedDesignUrlV2IssueProperties = async (
		issueIdOrKey: string,
		{ url }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		let response: GetIssuePropertyResponse;
		try {
			response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof NotFoundHttpClientError) {
				return; // Swallow not found errors
			}
			throw error;
		}

		const storedAttachedDesignUrlIssuePropertyValue = JSON.parse(
			ensureString(response.value),
		) as unknown;

		assertSchema<AttachedDesignUrlV2IssuePropertyValue>(
			storedAttachedDesignUrlIssuePropertyValue,
			ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA,
		);

		const newAttachedDesignUrlIssuePropertyValue =
			storedAttachedDesignUrlIssuePropertyValue.filter(
				(storedValue) => !this.areUrlsOfSameDesign(storedValue.url, url),
			);

		if (
			newAttachedDesignUrlIssuePropertyValue.length <
			storedAttachedDesignUrlIssuePropertyValue.length
		) {
			await jiraClient.setIssueProperty(
				issueIdOrKey,
				issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
				// Stringify the value twice for backwards compatibility (once here and once by `JiraClient.setIssueProperty`)
				JSON.stringify(newAttachedDesignUrlIssuePropertyValue),
				connectInstallation,
			);
		} else {
			getLogger().warn(
				`Design with url: ${url} that was requested to be deleted was not removed from the 'attached-design-v2' issue property array`,
			);
		}
	};

	private async getIssuePropertyJsonValue<T>(
		issueIdOrKey: string,
		propertyKey: string,
		connectInstallation: ConnectInstallation,
		schema: JSONSchemaTypeWithId<T>,
	): Promise<T | null> {
		try {
			const response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKey,
				connectInstallation,
			);
			return parseJsonOfSchema(response.value, schema);
		} catch (error) {
			if (
				error instanceof NotFoundHttpClientError ||
				error instanceof SchemaValidationError
			) {
				return null; // If property does not exist or value is in unexpected format, return null
			} else {
				throw error;
			}
		}
	}

	private isUrlForDesign = (
		storedUrl: string,
		figmaDesignId: FigmaDesignIdentifier,
	) => {
		try {
			return figmaDesignId.equals(
				FigmaDesignIdentifier.fromFigmaDesignUrl(new URL(storedUrl)),
			);
		} catch (error) {
			// For existing designs that were previously stored in the issue property, we may not be able to parse the URL.
			return false;
		}
	};

	private areUrlsOfSameDesign = (storedUrl: string, url: string) => {
		try {
			return FigmaDesignIdentifier.fromFigmaDesignUrl(new URL(url)).equals(
				FigmaDesignIdentifier.fromFigmaDesignUrl(new URL(storedUrl)),
			);
		} catch (error) {
			// For existing designs that were previously stored in the issue property, we may not be able to parse the URL.
			return false;
		}
	};

	/**
	 * @throws {SubmitDesignJiraServiceError}
	 */
	private throwIfSubmitDesignResponseHasErrors = (
		response: SubmitDesignsResponse,
	) => {
		if (response.rejectedEntities.length) {
			const { key, errors } = response.rejectedEntities[0];
			throw SubmitDesignJiraServiceError.designRejected(key.designId, errors);
		}

		// TODO: Confirm whether we need to consider the use case below as a failure and throw or just leave a warning.
		if (response.unknownIssueKeys?.length) {
			throw SubmitDesignJiraServiceError.unknownIssueKeys(
				response.unknownIssueKeys,
			);
		}

		if (response.unknownAssociations?.length) {
			throw SubmitDesignJiraServiceError.unknownAssociations(
				response.unknownAssociations.map(
					(x) => new AtlassianAssociation(x.associationType, x.values),
				),
			);
		}
	};

	/**
	 * Returns a design URL in the format expected by other integrations (e.g., "Jira" widget in Figma)
	 * in Issue Properties.
	 *
	 * @internal
	 * Visible only for testing.
	 */
	static buildDesignUrlForIssueProperties({
		url,
		displayName,
	}: AtlassianDesign): string {
		// In addition to standard encoding, encodes the "-" character, which is treated by the "Jira" widget
		// as space.
		const encodedName = encodeURIComponent(displayName).replaceAll('-', '%2D');

		const urlWithFileName = appendToPathname(new URL(url), encodedName);

		return urlWithFileName.toString();
	}
}

export const jiraService = new JiraService();

export class SubmitDesignJiraServiceError extends CauseAwareError {
	designId?: string;
	rejectionErrors?: { readonly message: string }[];
	unknownIssueKeys?: string[];
	unknownAssociations?: AtlassianAssociation[];

	private constructor({
		message,
		designId,
		rejectionErrors,
		unknownIssueKeys,
		unknownAssociations,
	}: {
		message: string;
		designId?: string;
		rejectionErrors?: { readonly message: string }[];
		unknownIssueKeys?: string[];
		unknownAssociations?: AtlassianAssociation[];
	}) {
		super(message);
		this.designId = designId;
		this.rejectionErrors = rejectionErrors;
		this.unknownIssueKeys = unknownIssueKeys;
		this.unknownAssociations = unknownAssociations;
	}

	static designRejected(
		designId: string,
		rejectionErrors: { readonly message: string }[],
	): SubmitDesignJiraServiceError {
		return new SubmitDesignJiraServiceError({
			message: 'The design submission has been rejected',
			designId,
			rejectionErrors,
		});
	}

	static unknownIssueKeys(unknownIssueKeys: string[]) {
		return new SubmitDesignJiraServiceError({
			message: 'The design has unknown issue keys',
			unknownIssueKeys,
		});
	}

	static unknownAssociations(unknownAssociations: AtlassianAssociation[]) {
		return new SubmitDesignJiraServiceError({
			message: 'The design has unknown associations',
			unknownAssociations,
		});
	}
}

export class ForbiddenByJiraServiceError extends CauseAwareError {}

export class IssueNotFoundJiraServiceError extends CauseAwareError {}
