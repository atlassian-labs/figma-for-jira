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
			getLogger().error(
				response.rejectedEntities[0].errors,
				'The design submission has been rejected.',
			);
			throw new Error('The design submission has been rejected.');
		}

		// TODO: Confirm whether we need to consider the use case below as a failure and throw or just leave a warning.
		if (response.unknownIssueKeys?.length) {
			getLogger().error(
				response.unknownIssueKeys,
				'The design has unknown issue keys.',
			);
			throw new Error('The design has unknown issue keys.');
		}

		if (response.unknownAssociations?.length) {
			getLogger().error(
				response.unknownAssociations,
				'The design has unknown associations.',
			);
			throw new Error('The design has unknown associations.');
		}
	};

	getIssue = async (
		issueIdOrKey: string,
		connectInstallation: ConnectInstallation,
	): Promise<JiraIssue> => {
		const response = await jiraClient.getIssue(issueIdOrKey, {
			baseUrl: connectInstallation.baseUrl,
			connectAppKey: connectInstallation.key,
			connectSharedSecret: connectInstallation.sharedSecret,
		});

		return response;
	};
}

export const jiraService = new JiraService();
