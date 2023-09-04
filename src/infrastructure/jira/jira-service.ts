import { jiraClient } from './jira-client';

import type {
	AtlassianDesign,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import { getLogger } from '../logger';

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
			const errorMessage = 'The design submission has been rejected.';
			getLogger().error(response.rejectedEntities[0].errors, errorMessage);
			throw new Error(errorMessage);
		}

		// TODO: Confirm whether we need to consider the use case below as a failure and throw or just leave a warning.
		if (response.unknownIssueKeys?.length) {
			const errorMessage = 'The design has unknown issue keys.';
			getLogger().error(response.unknownIssueKeys, errorMessage);
			throw new Error(errorMessage);
		}

		if (response.unknownAssociations?.length) {
			const errorMessage = 'The design has unknown associations.';
			getLogger().error(response.unknownAssociations, errorMessage);
			throw new Error(errorMessage);
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
