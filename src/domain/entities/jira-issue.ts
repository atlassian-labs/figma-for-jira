/**
 * A Jira issue.
 *
 * The type includes only the subset of available Issue fields required by the Connect App.
 *
 * @see https://www.atlassian.com/software/jira/guides/issues/overview#what-is-an-issue
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get-response
 */
export type JiraIssue = {
	readonly id: string;
	readonly key: string;
	readonly self: string;
	readonly fields: {
		readonly summary: string;
	};
};

export const buildJiraIssueUrl = (
	baseUrl: URL | string,
	issueKey: string,
): URL => {
	return new URL(`browse/${issueKey}`, baseUrl);
};
