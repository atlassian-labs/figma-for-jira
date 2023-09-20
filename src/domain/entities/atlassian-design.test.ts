import { AtlassianAssociation } from './atlassian-design';
import { JIRA_ISSUE_ATI } from './jira-issue';
import { generateJiraIssueAri } from './testing';

describe('AtlassianDesign', () => {
	describe('createDesignIssueAssociation', () => {
		test('should return issue-associated-design association', () => {
			const issueAri = generateJiraIssueAri();

			const association =
				AtlassianAssociation.createDesignIssueAssociation(issueAri);

			expect(association).toEqual({
				associationType: JIRA_ISSUE_ATI,
				values: [issueAri],
			});
		});
	});
});
