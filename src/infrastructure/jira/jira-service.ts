import { JiraServiceSubmitDesignError } from './errors';
import { jiraClient, JiraClientNotFoundError } from './jira-client';

import type {
	AtlassianDesign,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import { AtlassianAssociation } from '../../domain/entities';

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
		{ design, addAssociations, removeAssociations }: SubmitDesignParams,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const response = await jiraClient.submitDesigns(
			{
				designs: [
					{
						...design,
						addAssociations: addAssociations ?? [],
						removeAssociations: removeAssociations ?? [],
					},
				],
			},
			connectInstallation,
		);

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
		try {
			const response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
			);

			const storedAttachedDesignUrlIssuePropertyValues =
				response.value as AttachedDesignUrlV2IssuePropertyValue[];

			const newAttachedDesignUrlIssuePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
				{
					url,
					name: displayName,
				};

			await jiraClient.setIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				[
					...storedAttachedDesignUrlIssuePropertyValues,
					newAttachedDesignUrlIssuePropertyValue,
				],
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
				const newAttachedDesignUrlIssuePropertyValue: AttachedDesignUrlV2IssuePropertyValue =
					{
						url,
						name: displayName,
					};
				const value = [newAttachedDesignUrlIssuePropertyValue];
				await jiraClient.setIssueProperty(
					issueIdOrKey,
					propertyKeys.ATTACHED_DESIGN_URL_V2,
					value,
					connectInstallation,
				);
			} else {
				throw error;
			}
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

			if (response.value === design.url) {
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

	deleteFromAttachedDesignUrlV2IssueProperties = async (
		issueIdOrKey: string,
		{ url, displayName }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		try {
			const response = await jiraClient.getIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				connectInstallation,
			);

			const storedAttachedDesignUrlIssuePropertyValues =
				response.value as AttachedDesignUrlV2IssuePropertyValue[];

			const issuePropertyValueToRemove: AttachedDesignUrlV2IssuePropertyValue =
				{
					url,
					name: displayName,
				};

			const newAttachedDesignUrlIssuePropertyValue =
				storedAttachedDesignUrlIssuePropertyValues.filter(
					({ url }) => url !== issuePropertyValueToRemove.url,
				);

			await jiraClient.setIssueProperty(
				issueIdOrKey,
				propertyKeys.ATTACHED_DESIGN_URL_V2,
				newAttachedDesignUrlIssuePropertyValue,
				connectInstallation,
			);
		} catch (error) {
			if (error instanceof JiraClientNotFoundError) {
				return; // Swallow not found errors
			}
			throw error;
		}
	};
}

export const jiraService = new JiraService();
