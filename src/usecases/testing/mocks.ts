import { v4 as uuidv4 } from 'uuid';

import { JIRA_ISSUE_ENTITY_TYPE } from '../../common/constants';
import { generateIssueAri, ISSUE_ID } from '../../domain/entities/testing';

const SITE_ID = uuidv4();

export const MOCK_VALID_ASSOCIATION = {
	ari: generateIssueAri(ISSUE_ID),
	id: ISSUE_ID,
	type: JIRA_ISSUE_ENTITY_TYPE,
	cloudId: SITE_ID,
};
