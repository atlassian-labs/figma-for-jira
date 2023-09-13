import { AtlassianAssociation } from './atlassian-design';
import { generateIssueAri } from './testing';

import { JIRA_ISSUE_ATI } from '../../common/constants';

describe('AtlassianDesign', () => {
	describe('createDesignIssueAssociation', () => {
		test('should return issue-associated-design association', () => {
			const issueAri = generateIssueAri();

			const association =
				AtlassianAssociation.createDesignIssueAssociation(issueAri);

			expect(association).toEqual({
				associationType: JIRA_ISSUE_ATI,
				values: [issueAri],
			});
		});
	});
});
