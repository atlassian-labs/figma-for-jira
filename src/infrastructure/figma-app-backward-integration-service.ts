import { figmaService, UnauthorizedFigmaServiceError } from './figma';
import {
	ForbiddenByJiraServiceError,
	IssueNotFoundJiraServiceError,
	jiraService,
} from './jira';
import { getLogger } from './logger';

import type { AtlassianDesign, ConnectInstallation } from '../domain/entities';
import { buildJiraIssueUrl, FigmaDesignIdentifier } from '../domain/entities';

export class FigmaAppBackwardIntegrationService {
	/**
	 * Handles the backward integration with the "Jira" Widget and Plugin in Figma:
	 * - Sets the Figma design URL to Jira Issue Properties
	 * - Creates a Dev Resource for the Figma File/Node.
	 *
	 * Makes the best effort to perform the operation: it swallows expected errors (e.g., lack of permissions
	 * to access Jira Issue) and throws only unexpected ones.
	 */
	tryHandleLinkedDesign = async ({
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
	}) => {
		try {
			const issue = await jiraService.getIssue(issueId, connectInstallation);

			await Promise.all([
				jiraService.saveDesignUrlInIssueProperties(
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
		} catch (e) {
			if (
				e instanceof ForbiddenByJiraServiceError ||
				e instanceof IssueNotFoundJiraServiceError ||
				e instanceof UnauthorizedFigmaServiceError
			) {
				getLogger().warn(
					'Skipping handling backward integration with Figma due to the expected error.',
					e,
				);
				return;
			}

			throw e;
		}
	};
}

export const figmaAppBackwardIntegrationService =
	new FigmaAppBackwardIntegrationService();
