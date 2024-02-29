import { jiraAppConfigurationService } from './jira-app-configuration-service';
import { jiraDesignIssuePropertyService } from './jira-design-issue-property-service';
import { jiraDesignService } from './jira-design-service';
import { jiraIssueService } from './jira-issue-service';
import { jiraUserService } from './jira-user-service';

export class JiraService {
	/**
	 * @throws {JiraSubmitDesignServiceError} Design submission fails.
	 */
	submitDesign = jiraDesignService.submitDesign.bind(jiraDesignService);

	/**
	 * @throws {JiraSubmitDesignServiceError} Design submission fails.
	 */
	submitDesigns = jiraDesignService.submitDesigns.bind(jiraDesignService);

	/**
	 * @throws {NotFoundInJiraServiceError} Issue does not exist or the app does not have permission to read it.
	 */
	getIssue = jiraIssueService.getIssue.bind(jiraIssueService);

	setAppConfigurationState =
		jiraAppConfigurationService.setAppConfigurationState.bind(
			jiraAppConfigurationService,
		);

	deleteAppConfigurationState =
		jiraAppConfigurationService.deleteAppConfigurationState.bind(
			jiraAppConfigurationService,
		);

	trySaveDesignUrlInIssueProperties =
		jiraDesignIssuePropertyService.trySaveDesignUrlInIssueProperties.bind(
			jiraDesignIssuePropertyService,
		);

	tryDeleteDesignUrlFromIssueProperties =
		jiraDesignIssuePropertyService.tryDeleteDesignUrlFromIssueProperties.bind(
			jiraDesignIssuePropertyService,
		);

	isAdmin = jiraUserService.isAdmin.bind(jiraUserService);
}

export const jiraService = new JiraService();
