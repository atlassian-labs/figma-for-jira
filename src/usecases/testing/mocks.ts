import { v4 as uuidv4 } from 'uuid';

import { JIRA_ISSUE_ATI } from '../../common/constants';
import { generateIssueAri, MOCK_ISSUE_ID } from '../../domain/entities/testing';

const SITE_ID = uuidv4();

export const MOCK_VALID_ASSOCIATION = {
	ari: generateIssueAri(MOCK_ISSUE_ID),
	id: MOCK_ISSUE_ID,
	type: JIRA_ISSUE_ATI,
	cloudId: SITE_ID,
};
