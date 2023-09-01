import { jiraClient } from './jira-client';
import {
	AtlassianDesign,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import { getLogger } from '../logger';

export class JiraService {
	submitDesign = async (
		design: AtlassianDesign,
		connectInstallation: ConnectInstallation,
	): Promise<any> => {
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

		if (response.rejectedEntities.length > 0) {
			getLogger().error(
				response.rejectedEntities[0].errors,
				'The design submission has been rejected.',
			);
			throw new Error('The design submission has been rejected.');
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
