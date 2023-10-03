import { JiraServiceSubmitDesignError } from './errors';
import type {
	GetIssuePropertyResponse,
	SubmitDesignsResponse,
} from './jira-client';
import { jiraClient, JiraClientNotFoundError } from './jira-client';
import { ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA } from './schemas';

import { ensureString } from '../../common/stringUtils';
import type {
	AtlassianDesign,
	ConnectInstallation,
	FigmaDesignIdentifier,
	JiraIssue,
} from '../../domain/entities';
import { AtlassianAssociation } from '../../domain/entities';
import { assertSchema } from '../ajv';
import { getLogger } from '../logger';

type SubmitDesignParams = {
	readonly design: AtlassianDesign;
	readonly addAssociations?: AtlassianAssociation[];
	readonly removeAssociations?: AtlassianAssociation[];
};

export type AttachedDesignUrlV2IssuePropertyValue = {
	readonly url: string;
	readonly name: string;
};

export const propertyKeys = {
	ATTACHED_DESIGN_URL: 'attached-design-url',
	ATTACHED_DESIGN_URL_V2: 'attached-design-url-v2',
};

class JiraService {
	submitDesign = async (
		params: SubmitDesignParams,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		return this.submitDesigns([params], connectInstallation);
	};

	submitDesigns = async (
		designs: SubmitDesignParams[],
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const associationsLastUpdated = new Date();
		const response = await jiraClient.submitDesigns(
			{
				designs: designs.map(
					({ design, addAssociations, removeAssociations }) => ({
						...design,
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

	deleteDesign = async (
		designId: FigmaDesignIdentifier,
		connectInstallation: ConnectInstallation,
	): Promise<FigmaDesignIdentifier> => {
		return await jiraClient.deleteDesign(designId, connectInstallation);
	};

	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<JiraIssue> => {
		return await jiraClient.getIssue(issueIdOrKey, connectInstallation);
	};

	saveDesignUrlInIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		await Promise.all([
			this.setAttachedDesignUrlInIssuePropertiesIfMissing(
				issueIdOrKey,
				design,
				connectInstallation,
			),
			this.updateAttachedDesignUrlV2IssueProperty(
				issueIdOrKey,
				design,
				connectInstallation,
			),
		]);
	};

	/**
	 * @internal
	 * Only visible for testing. Please use {@link saveDesignUrlInIssueProperties}
	 */
	setAttachedDesignUrlInIssuePropertiesIfMissing = async (
		issueIdOrKey: string,
		{ url }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
				await jiraClient.setIssueProperty(
					issueIdOrKey,
					propertyKeys.ATTACHED_DESIGN_URL,
					url,
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
		{ url, displayName }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		let response: GetIssuePropertyResponse;
		try {
			response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
				const newAttachedDesignUrlIssuePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
					{
						url,
						name: displayName,
					};
				await jiraClient.setIssueProperty(
					issueIdOrKey,
					propertyKeys.ATTACHED_DESIGN_URL_V2,
					this.superStringify([newAttachedDesignUrlIssuePropertyValue]),
					connectInstallation,
				);
				return;
			} else {
				throw error;
			}
		}

		const storedAttachedDesignUrlIssuePropertyValue = JSON.parse(
			ensureString(response.value),
		) as unknown;

		assertSchema<AttachedDesignUrlV2IssuePropertyValue[]>(
			storedAttachedDesignUrlIssuePropertyValue,
			ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA,
		);

		if (
			!storedAttachedDesignUrlIssuePropertyValue.find(
				(value) => value.url === url,
			)
		) {
			const newAttachedDesignUrlIssuePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
				{
					url,
					name: displayName,
				};

			await jiraClient.setIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				this.superStringify([
					...storedAttachedDesignUrlIssuePropertyValue,
					newAttachedDesignUrlIssuePropertyValue,
				]),
				connectInstallation,
			);
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
				propertyKeys.ATTACHED_DESIGN_URL,
				connectInstallation,
			);

			const storedUrl = response.value;

			if (storedUrl === design.url) {
				await jiraClient.deleteIssueProperty(
					issueIdOrKey,
					propertyKeys.ATTACHED_DESIGN_URL,
					connectInstallation,
				);
			}
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
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
		{ url, displayName }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		let response: GetIssuePropertyResponse;
		try {
			response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
				return; // Swallow not found errors
			}
			throw error;
		}

		const storedAttachedDesignUrlIssuePropertyValue = JSON.parse(
			ensureString(response.value),
		) as unknown;

		assertSchema<AttachedDesignUrlV2IssuePropertyValue[]>(
			storedAttachedDesignUrlIssuePropertyValue,
			ATTACHED_DESIGN_URL_V2_VALUE_SCHEMA,
		);

		const issuePropertyValueToRemove: AttachedDesignUrlV2IssuePropertyValue = {
			url,
			name: displayName,
		};

		const newAttachedDesignUrlIssuePropertyValue =
			storedAttachedDesignUrlIssuePropertyValue.filter(
				({ url }) => url !== issuePropertyValueToRemove.url,
			);

		if (
			newAttachedDesignUrlIssuePropertyValue.length <
			storedAttachedDesignUrlIssuePropertyValue.length
		) {
			await jiraClient.setIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				this.superStringify(newAttachedDesignUrlIssuePropertyValue),
				connectInstallation,
			);
		} else {
			getLogger().warn(
				`Design with url: ${url} that was requested to be deleted was not removed from the 'attached-design-v2' issue property array`,
			);
		}
	};

	/**
	 * This isn't ideal but must be done as it's how the current implementation works
	 * Need to keep this way so current implementation doesn't break
	 */
	private superStringify(
		issuePropertyValue: AttachedDesignUrlV2IssuePropertyValue[],
	) {
		return JSON.stringify(JSON.stringify(issuePropertyValue));
	}

	private throwIfSubmitDesignResponseHasErrors = (
		response: SubmitDesignsResponse,
	) => {
		if (response.rejectedEntities.length) {
			const { key, errors } = response.rejectedEntities[0];
			throw JiraServiceSubmitDesignError.designRejected(key.designId, errors);
		}

		// TODO: Confirm whether we need to consider the use case below as a failure and throw or just leave a warning.
		if (response.unknownIssueKeys?.length) {
			throw JiraServiceSubmitDesignError.unknownIssueKeys(
				response.unknownIssueKeys,
			);
		}

		if (response.unknownAssociations?.length) {
			throw JiraServiceSubmitDesignError.unknownAssociations(
				response.unknownAssociations.map(
					(x) => new AtlassianAssociation(x.associationType, x.values),
				),
			);
		}
	};
}

export const jiraService = new JiraService();
