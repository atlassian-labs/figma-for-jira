import { AtlassianDesignAssociation } from './atlassian-design';
import { generateIssueAri } from './testing';

describe('AtlassianDesign', () => {
	describe('withJiraIssue', () => {
		test('should return design-to-issue association', () => {
			const issueAri = generateIssueAri();

			const association = AtlassianDesignAssociation.withJiraIssue(issueAri);

			expect(association).toEqual({
				associationType: 'issue-associated-design',
				values: [issueAri],
			});
		});
	});
});
