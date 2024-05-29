import { ForbiddenByJiraServiceError } from './errors';
import type { GetIssuePropertyResponse } from './jira-client';
import { jiraClient } from './jira-client';

import type { JSONSchemaTypeWithId } from '../../common/schema-validation';
import {
	assertSchema,
	parseJsonOfSchema,
	SchemaValidationError,
} from '../../common/schema-validation';
import { ensureString, isString } from '../../common/string-utils';
import { appendToPathname } from '../../common/url-utils';
import type {
	AtlassianDesign,
	ConnectInstallation,
} from '../../domain/entities';
import { FigmaDesignIdentifier } from '../../domain/entities';
import {
	ForbiddenHttpClientError,
	NotFoundHttpClientError,
} from '../http-client-errors';
import { getLogger } from '../logger';

type AttachedDesignUrlV2IssuePropertyValue = {
	readonly url: string;
	readonly name: string;
}[];

const issuePropertyKeys = {
	ATTACHED_DESIGN_URL: 'attached-design-url',
	ATTACHED_DESIGN_URL_V2: 'attached-design-url-v2',
};

const ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA: JSONSchemaTypeWithId<AttachedDesignUrlV2IssuePropertyValue> =
	{
		$id: 'jira-software-cloud-api:attached-design-url-v2:value',
		type: 'array',
		items: {
			type: 'object',
			properties: {
				url: { type: 'string' },
				name: { type: 'string' },
			},
			required: ['url', 'name'],
		},
	};

export class JiraDesignIssuePropertyService {
	trySaveDesignUrlInIssueProperties = async (
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
		} catch (error) {
			if (error instanceof ForbiddenByJiraServiceError) {
				return getLogger().warn(
					'The app does not have permission to edit the Issue.',
					error,
				);
			}

			throw error;
		}
	};

	tryDeleteDesignUrlFromIssueProperties = async (
		issueIdOrKey: string,
		figmaDesignId: FigmaDesignIdentifier,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			await Promise.all([
				await this.deleteAttachedDesignUrlInIssuePropertiesIfPresent(
					issueIdOrKey,
					figmaDesignId,
					connectInstallation,
				),
				await this.deleteFromAttachedDesignUrlV2IssueProperties(
					issueIdOrKey,
					figmaDesignId,
					connectInstallation,
				),
			]);
		} catch (error) {
			if (error instanceof ForbiddenByJiraServiceError) {
				return getLogger().warn(
					'The app does not have permission to edit the Issue.',
					error,
				);
			}

			throw error;
		}
	};

	/**
	 * @internal
	 * Visible only for testing.
	 *
	 * @throws {ForbiddenByJiraServiceError} The app does not have permission to edit the Issue.
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
	): Promise<void> =>
		this.withErrorTranslation(async () => {
			try {
				await jiraClient.getIssueProperty(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL,
					connectInstallation,
				);
			} catch (error) {
				if (error instanceof NotFoundHttpClientError) {
					const value =
						JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
							design,
						);

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
		});

	/**
	 * @internal
	 * Visible only for testing.
	 *
	 * @throws {ForbiddenByJiraServiceError} The app does not have permission to edit the Issue.
	 */
	updateAttachedDesignUrlV2IssueProperty = async (
		issueIdOrKey: string,
		figmaDesignIdToReplace: FigmaDesignIdentifier,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> =>
		this.withErrorTranslation(async () => {
			const storedValue =
				await this.getIssuePropertyJsonValue<AttachedDesignUrlV2IssuePropertyValue>(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					connectInstallation,
					ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA,
				);

			const newItem = {
				url: JiraDesignIssuePropertyService.buildDesignUrlForIssueProperties(
					design,
				),
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
		});

	/**
	 * @internal
	 * Visible only for testing.
	 */
	deleteAttachedDesignUrlInIssuePropertiesIfPresent = async (
		issueIdOrKey: string,
		figmaDesignId: FigmaDesignIdentifier,
		connectInstallation: ConnectInstallation,
	): Promise<void> =>
		this.withErrorTranslation(async () => {
			try {
				const response = await jiraClient.getIssueProperty(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL,
					connectInstallation,
				);

				const storedUrl = response.value;

				if (!isString(storedUrl)) return;
				if (!this.isUrlForDesign(storedUrl, figmaDesignId)) return;

				await jiraClient.deleteIssueProperty(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL,
					connectInstallation,
				);
			} catch (error) {
				if (error instanceof NotFoundHttpClientError) {
					return;
				}
				throw error;
			}
		});

	/**
	 * @internal
	 * Only visible for testing.
	 *
	 * @throws {ForbiddenByJiraServiceError} The app does not have permission to edit the Issue.
	 */
	deleteFromAttachedDesignUrlV2IssueProperties = async (
		issueIdOrKey: string,
		figmaDesignId: FigmaDesignIdentifier,
		connectInstallation: ConnectInstallation,
	): Promise<void> =>
		this.withErrorTranslation(async () => {
			let response: GetIssuePropertyResponse;
			try {
				response = await jiraClient.getIssueProperty(
					issueIdOrKey,
					issuePropertyKeys.ATTACHED_DESIGN_URL_V2,
					connectInstallation,
				);
			} catch (error) {
				if (error instanceof NotFoundHttpClientError) {
					return;
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
					(storedValue) => !this.isUrlForDesign(storedValue.url, figmaDesignId),
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
					`Design with ID: ${figmaDesignId.toAtlassianDesignId()} that was requested to be deleted was not removed from the 'attached-design-v2' issue property array`,
				);
			}
		});

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

	/**
	 * @throws {ForbiddenByJiraServiceError} Forbidden to perform this operation in Jira.
	 */
	private withErrorTranslation = async <T>(fn: () => Promise<T>) => {
		try {
			return await fn();
		} catch (e: unknown) {
			if (e instanceof ForbiddenHttpClientError) {
				throw new ForbiddenByJiraServiceError(
					'Forbidden to perform the operation.',
					e,
				);
			}

			throw e;
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

export const jiraDesignIssuePropertyService =
	new JiraDesignIssuePropertyService();
