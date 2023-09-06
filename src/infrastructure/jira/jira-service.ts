import { JiraServiceSubmitDesignError } from './errors';
import {
	jiraClient,
	JiraClientNotFoundError,
	JiraClientParams,
} from './jira-client';

import type {
	AtlassianDesign,
	AttachedDesignUrlProperty,
	AttachedDesignUrlPropertyKey,
	AttachedDesignUrlV2,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';

export class JiraService {
	submitDesign = async (
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const response = await jiraClient.submitDesigns(
			{
				designs: [design],
			},
			JiraClientParams.fromConnectInstallation(connectInstallation),
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
				response.unknownAssociations,
			);
		}
	};

	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<JiraIssue> => {
		return await jiraClient.getIssue(
			issueIdOrKey,
			JiraClientParams.fromConnectInstallation(connectInstallation),
		);
	};

	setAttachedDesignUrlInIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const clientParams =
			JiraClientParams.fromConnectInstallation(connectInstallation);
		const propertyKey = 'attached-design-url';
		try {
			await this.getAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				clientParams,
			);
		} catch (e) {
			await this.handleAttachedDesignUrlErrors(
				e,
				issueIdOrKey,
				propertyKey,
				design,
				clientParams,
			);
		}
	};

	setAttachedDesignUrlV2InIssueProperties = async (
		issueIdOrKey: string,
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<void> => {
		const propertyKey = 'attached-design-url-v2';
		const clientParams =
			JiraClientParams.fromConnectInstallation(connectInstallation);
		try {
			const response = await this.getAttachedDesignUrlProperty(
				issueIdOrKey,
				propertyKey,
				clientParams,
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
				clientParams,
			);
		} catch (e) {
			await this.handleAttachedDesignUrlErrors(
				e,
				issueIdOrKey,
				propertyKey,
				design,
				clientParams,
			);
		}
	};

	private getAttachedDesignUrlProperty = async <
		T extends AttachedDesignUrlPropertyKey,
	>(
		issueIdOrKey: string,
		propertyKey: T,
		clientParams: JiraClientParams,
	): Promise<AttachedDesignUrlProperty<T>> => {
		const response = await jiraClient.getIssueProperty(
			issueIdOrKey,
			propertyKey,
			clientParams,
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
		clientParams: JiraClientParams,
	) => {
		if (error instanceof JiraClientNotFoundError) {
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
				clientParams,
			);
		} else {
			throw error;
		}
	};

	private setAttachedDesignUrlProperty = async (
		issueIdOrKey: string,
		propertyKey: AttachedDesignUrlPropertyKey,
		value: string,
		clientParams: JiraClientParams,
	) => {
		await jiraClient.setIssueProperty(
			issueIdOrKey,
			propertyKey,
			value,
			clientParams,
		);
	};
}

export const jiraService = new JiraService();
