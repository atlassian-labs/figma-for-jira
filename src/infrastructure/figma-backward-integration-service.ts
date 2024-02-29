import { figmaService } from './figma';
import { jiraService, NotFoundInJiraServiceError } from './jira';
import { getLogger } from './logger';

import type {
	AtlassianDesign,
	ConnectInstallation,
	JiraIssue,
} from '../domain/entities';
import { buildJiraIssueUrl, FigmaDesignIdentifier } from '../domain/entities';

/**
 * A service to encapsulate logic for supporting the backward integration with Figma, in particular with
 * the "Jira" Widget and Plugin in Figma.
 */
export class FigmaBackwardIntegrationService {
	/**
	 * Notifies Figma on the added Issue-Design association:
	 * - Sets the Figma design URL to Jira Issue Properties
	 * - Creates a Dev Resource for Jira Issue for the target Figma File/Node.
	 *
	 * Makes the best effort to perform the operation: silently stops the operation in case of an expected error
	 * (e.g., a lack of permissions to read Jira Issue) and throws only in case of an unexpected error.
	 */
	tryNotifyFigmaOnAddedIssueDesignAssociation = async ({
		originalFigmaDesignId,
		design,
		issueId,
		atlassianUserId,
		connectInstallation,
	}: {
		readonly originalFigmaDesignId: FigmaDesignIdentifier;
		readonly design: AtlassianDesign;
		readonly issueId: string;
		readonly atlassianUserId: string;
		readonly connectInstallation: ConnectInstallation;
	}): Promise<void> => {
		let issue: JiraIssue;

		try {
			issue = await jiraService.getIssue(issueId, connectInstallation);
		} catch (e) {
			if (e instanceof NotFoundInJiraServiceError) {
				return getLogger().warn(
					'Skipping handling backward integration as the Issue has been deleted or the app does not have permission to read it.',
					e,
				);
			}

			throw e;
		}

		await Promise.all([
			jiraService.trySaveDesignUrlInIssueProperties(
				issueId,
				originalFigmaDesignId,
				design,
				connectInstallation,
			),
			figmaService.tryCreateDevResourceForJiraIssue({
				designId: FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				issue: {
					url: buildJiraIssueUrl(connectInstallation.baseUrl, issue.key),
					key: issue.key,
					title: issue.fields.summary,
				},
				user: {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			}),
		]);
	};

	/**
	 * Notifies Figma on the removed Issue-Design association.
	 * - Removes the Figma design URL from Jira Issue Properties
	 * - Deletes the Dev Resource for Jira Issue from the target Figma File/Node.
	 *
	 * Makes the best effort to perform the operation: silently stops the operation in case of an expected error
	 * (e.g., a lack of permissions to read Jira Issue) and throws only in case of an unexpected error.
	 */
	tryNotifyFigmaOnRemovedIssueDesignAssociation = async ({
		design,
		issueId,
		atlassianUserId,
		connectInstallation,
	}: {
		readonly design: AtlassianDesign;
		readonly issueId: string;
		readonly atlassianUserId: string;
		readonly connectInstallation: ConnectInstallation;
	}): Promise<void> => {
		let issue: JiraIssue;

		try {
			issue = await jiraService.getIssue(issueId, connectInstallation);
		} catch (e) {
			if (e instanceof NotFoundInJiraServiceError) {
				return getLogger().warn(
					'Skipping handling backward integration as the Issue has been deleted or the app does not have permission to read it.',
					e,
				);
			}

			throw e;
		}

		await Promise.all([
			jiraService.tryDeleteDesignUrlFromIssueProperties(
				issueId,
				design,
				connectInstallation,
			),
			figmaService.tryDeleteDevResource({
				designId: FigmaDesignIdentifier.fromAtlassianDesignId(design.id),
				devResourceUrl: buildJiraIssueUrl(
					connectInstallation.baseUrl,
					issue.key,
				),
				user: {
					atlassianUserId,
					connectInstallationId: connectInstallation.id,
				},
			}),
		]);
	};
}

export const figmaBackwardIntegrationService =
	new FigmaBackwardIntegrationService();
