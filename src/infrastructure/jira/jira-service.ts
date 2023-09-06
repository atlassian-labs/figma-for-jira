import { JiraServiceSubmitDesignError } from './errors';
import { jiraClient } from './jira-client';

import type {
	AtlassianDesign,
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
			{
				baseUrl: connectInstallation.baseUrl,
				connectAppKey: connectInstallation.key,
				connectSharedSecret: connectInstallation.sharedSecret,
			},
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
		return await jiraClient.getIssue(issueIdOrKey, {
			baseUrl: connectInstallation.baseUrl,
			connectAppKey: connectInstallation.key,
			connectSharedSecret: connectInstallation.sharedSecret,
		});
	};
}

export const jiraService = new JiraService();
