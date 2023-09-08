import { AxiosError, HttpStatusCode } from 'axios';

import { JiraServiceSubmitDesignError } from './errors';
import { jiraClient } from './jira-client';

import type {
	AtlassianDesign,
	AttachedDesignUrlProperty,
	AttachedDesignUrlPropertyKey,
	AttachedDesignUrlV2,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import { AtlassianAssociation } from '../../domain/entities';

type SubmitDesignParams = {
	readonly design: AtlassianDesign;
	readonly addAssociations?: AtlassianAssociation[];
	readonly removeAssociations?: AtlassianAssociation[];
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

	setAttachedDesignUrlInIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const propertyKey = 'attached-design-url';
		try {
			await this.getAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				connectInstallation,
			);
		} catch (e) {
			await this.handleAttachedDesignUrlErrors(
				e,
				issueIdOrKey,
				propertyKey,
				design,
				connectInstallation,
			);
		}
	};

	setAttachedDesignUrlV2InIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const propertyKey = 'attached-design-url-v2';
		try {
			const response = await this.getAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				connectInstallation,
			);

			const storedValue = JSON.parse(response.value) as AttachedDesignUrlV2[];

			const newDesignUrl: AttachedDesignUrlV2 = {
				url: design.url,
				name: design.displayName,
			};

			await this.setAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				JSON.stringify([...storedValue, newDesignUrl]),
				connectInstallation,
			);
		} catch (e) {
			await this.handleAttachedDesignUrlErrors(
				e,
				issueIdOrKey,
				propertyKey,
				design,
				connectInstallation,
			);
		}
	};

	private getAttachedDesignUrlProperty = async <
		T extends AttachedDesignUrlPropertyKey,
	>(
		issueIdOrKey: string,
		propertyKey: T,
		connectInstallation: ConnectInstallation,
	): Promise<AttachedDesignUrlProperty<T>> => {
		const response = await jiraClient.getIssueProperty(
			issueIdOrKey,
			propertyKey,
			connectInstallation,
		);
		return {
			key: response.key as T,
			value: response.value as string,
		};
	};

	private handleAttachedDesignUrlErrors = async (
		error: unknown,
		issueIdOrKey: string,
		propertyKey: AttachedDesignUrlPropertyKey,
		{ url, displayName }: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	) => {
		if (
			error instanceof AxiosError &&
			error.response?.status === HttpStatusCode.NotFound
		) {
			let value: string;
			if (propertyKey === 'attached-design-url') {
				value = url;
			} else {
				const newDesignUrl: AttachedDesignUrlV2 = {
					url: url,
					name: displayName,
				};
				value = JSON.stringify([newDesignUrl]);
			}
			await this.setAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				value,
				connectInstallation,
			);
		} else {
			throw error;
		}
	};

	private setAttachedDesignUrlProperty = async (
		issueIdOrKey: string,
		propertyKey: AttachedDesignUrlPropertyKey,
		value: string,
		connectInstallation: ConnectInstallation,
	) => {
		await jiraClient.setIssueProperty(
			issueIdOrKey,
			propertyKey,
			value,
			connectInstallation,
		);
	};
}

export const jiraService = new JiraService();
