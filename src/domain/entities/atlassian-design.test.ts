import { AtlassianAssociation } from './atlassian-design';
import { generateIssueAri } from './testing';

describe('AtlassianDesign', () => {
	describe('createDesignIssueAssociation', () => {
		test('should return issue-associated-design association', () => {
			const issueAri = generateIssueAri();

			const association =
				AtlassianAssociation.createDesignIssueAssociation(issueAri);

			expect(association).toEqual({
				associationType: 'issue-associated-design',
				values: [issueAri],
			});
		});
	});
});
