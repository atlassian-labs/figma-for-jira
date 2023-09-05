import { jiraClient } from './jira-client';

import type {
	AtlassianDesign,
	AtlassianDesignAssociation,
	ConnectInstallation,
	JiraIssue,
} from '../../domain/entities';
import { getLogger } from '../logger';

type SubmitDesignParams = {
	readonly design: AtlassianDesign;
	readonly addAssociations?: AtlassianDesignAssociation[];
	readonly removeAssociations?: AtlassianDesignAssociation[];
};

export class JiraService {
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
			{
				baseUrl: connectInstallation.baseUrl,
				connectAppKey: connectInstallation.key,
				connectSharedSecret: connectInstallation.sharedSecret,
			},
		);

		if (response.rejectedEntities.length) {
			const error = new Error('The design submission has been rejected.');
			getLogger().error(
				error,
				'Rejected entities: %o',
				response.rejectedEntities[0].errors,
			);
			throw error;
		}

		// TODO: Confirm whether we need to consider the use case below as a failure and throw or just leave a warning.
		if (response.unknownIssueKeys?.length) {
			const error = new Error('The design has unknown issue keys.');
			getLogger().error(
				error,
				'Unknown issue keys: %o',
				response.unknownIssueKeys,
			);
			throw error;
		}

		if (response.unknownAssociations?.length) {
			const error = new Error('The design has unknown associations.');
			getLogger().error(
				error,
				'Unknown associations: %o',
				response.unknownAssociations,
			);
			throw error;
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
