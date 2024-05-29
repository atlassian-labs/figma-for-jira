import { figmaService, UnauthorizedFigmaServiceError } from './figma';
import { buildDesignUrl } from './figma/transformers/utils';
import { jiraService } from './jira';
import type { IssuePropertyInputDesignData } from './jira/jira-design-issue-property-service';
import { getLogger } from './logger';

import type {
	ConnectInstallation,
	FigmaDesignIdentifier,
} from '../domain/entities';
import { buildJiraIssueUrl } from '../domain/entities';

/**
 * A service to encapsulate logic for supporting the backward integration with Figma, in particular with
 * the "Jira" Widget and Plugin in Figma.
 */
export class FigmaBackwardIntegrationServiceV2 {
	/**
	 * Notifies Figma on the added Issue-Design association:
	 * - Sets the Figma design URL to Jira Issue Properties
	 * - Creates a Dev Resource for Jira Issue for the target Figma File/Node.
	 *
	 * Makes the best effort to perform the operation: silently stops the operation in case of an expected error
	 * (e.g., a lack of permissions to read Jira Issue) and throws only in case of an unexpected error.
	 */
	tryNotifyFigmaOnAddedIssueDesignAssociation = async (params: {
		readonly originalFigmaDesignId: FigmaDesignIdentifier;
		readonly figmaDesignId: FigmaDesignIdentifier;
		readonly issueId: string;
		readonly atlassianUserId?: string;
		readonly connectInstallation: ConnectInstallation;
	}): Promise<void> => {
		await jiraService.trySaveDesignInIssueProperties(
			params.issueId,
			params.originalFigmaDesignId,
			await this.getIssuePropertyInputDesignData(params),
			params.connectInstallation,
		);

		// Atlassian User ID should always be provided within the normal business flows.
		// However, there can be edge cases when the association is removed in from a user-less context on
		// Atlassian side (e.g., on a system event, data migration, etc.).
		if (!params.atlassianUserId) {
			return getLogger().warn(
				'Skipping deleting a Dev Resource since Atlassian User ID is not given and it is impossible to determine Figma credentials without it.',
			);
		}

		const issue = await jiraService.getIssue(
			params.issueId,
			params.connectInstallation,
		);

		if (!issue) {
			return getLogger().warn(
				'Skipping creating a Dev Resource since the Issue has been deleted or the app does not have permission to read it.',
			);
		}

		try {
			await figmaService.tryCreateDevResourceForJiraIssue({
				designId: params.figmaDesignId,
				issue: {
					url: buildJiraIssueUrl(params.connectInstallation.baseUrl, issue.key),
					key: issue.key,
					title: issue.fields.summary,
				},
				user: {
					atlassianUserId: params.atlassianUserId,
					connectInstallationId: params.connectInstallation.id,
				},
			});
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				return getLogger().warn(
					'Failed to create the Dev Resource with Figma credentials for the given Atlassian user.',
					e,
				);
			}
			throw e;
		}
	};

	/**
	 * Notifies Figma on the removed Issue-Design association.
	 * - Removes the Figma design URL from Jira Issue Properties
	 * - Deletes the Dev Resource for Jira Issue from the target Figma File/Node.
	 *
	 * Makes the best effort to perform the operation: silently stops the operation in case of an expected error
	 * (e.g., a lack of permissions to read Jira Issue) and throws only in case of an unexpected error.
	 */
	tryNotifyFigmaOnRemovedIssueDesignAssociation = async (params: {
		readonly figmaDesignId: FigmaDesignIdentifier;
		readonly issueId: string;
		readonly atlassianUserId?: string;
		readonly connectInstallation: ConnectInstallation;
	}): Promise<void> => {
		await jiraService.tryDeleteDesignFromIssueProperties(
			params.issueId,
			params.figmaDesignId,
			params.connectInstallation,
		);

		// Atlassian User ID should always be provided within the normal business flows.
		// However, there can be edge cases when the association is removed in from a user-less context on
		// Atlassian side (e.g., on a system event, data migration, etc.).
		if (!params.atlassianUserId) {
			return getLogger().warn(
				'Skipping deleting a Dev Resource since Figma credentials cannot be retrieved without an Atlassian User ID.',
			);
		}

		const issue = await jiraService.getIssue(
			params.issueId,
			params.connectInstallation,
		);

		if (!issue) {
			return getLogger().warn(
				'Skipping deleting a Dev Resource as the Issue has been deleted or the app does not have permission to read it.',
			);
		}

		try {
			await figmaService.tryDeleteDevResource({
				designId: params.figmaDesignId,
				devResourceUrl: buildJiraIssueUrl(
					params.connectInstallation.baseUrl,
					issue.key,
				),
				user: {
					atlassianUserId: params.atlassianUserId,
					connectInstallationId: params.connectInstallation.id,
				},
			});
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) {
				return getLogger().warn(
					'Failed to delete the Dev Resource with Figma credentials for the given Atlassian user.',
					e,
				);
			}
			throw e;
		}
	};

	private getIssuePropertyInputDesignData = async (params: {
		readonly figmaDesignId: FigmaDesignIdentifier;
		readonly atlassianUserId?: string;
		readonly connectInstallation: ConnectInstallation;
	}): Promise<IssuePropertyInputDesignData> => {
		const fallbackValue = {
			url: buildDesignUrl(params.figmaDesignId).toString(),
			displayName: 'Untitled',
		};

		if (!params.atlassianUserId) return fallbackValue;

		try {
			const design = await figmaService.getDesign(params.figmaDesignId, {
				atlassianUserId: params.atlassianUserId,
				connectInstallationId: params.connectInstallation.id,
			});

			return design ?? fallbackValue;
		} catch (e) {
			if (e instanceof UnauthorizedFigmaServiceError) return fallbackValue;

			throw e;
		}
	};
}

export const figmaBackwardIntegrationServiceV2 =
	new FigmaBackwardIntegrationServiceV2();
