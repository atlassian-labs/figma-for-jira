import { AtlassianAssociation } from './atlassian-design';
import { generateJiraIssueAri } from './testing';

describe('AtlassianDesign', () => {
	describe('createDesignIssueAssociation', () => {
		test('should return issue-associated-design association', () => {
			const issueAri = generateJiraIssueAri();

			const association =
				AtlassianAssociation.createDesignIssueAssociation(issueAri);

			expect(association).toEqual({
				associationType: 'ati:cloud:jira:issue',
				values: [issueAri],
			});
		});
	});
});
